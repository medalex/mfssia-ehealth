import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DkgService } from '@/providers/dkg/dkg.service';
import { PhysicianRegistryService } from '@/modules/physician-registry/physician-registry.service';
import { ContraindicationService } from '@/modules/contraindication/contraindication.service';
import { PatientRecordService } from '@/modules/patient-record/patient-record.service';
import { LabRecordService } from '@/modules/lab-record/lab-record.service';
import { EvmPublisherService } from '@/modules/evm-publisher/evm-publisher.service';

// ─────────────────────────────────────────────────────────────────────────────
// Shared contract with ehealth-zkp-prover. A smart contract cannot read the DKG,
// so the governed state has to be pushed on-chain by transaction, and the value
// pushed must be byte-identical to what the prover will put in the proof's public
// inputs. Every constant below therefore MIRRORS prover.service.ts — if one side
// changes, the hashes stop matching and every proof is rejected as a governance
// mismatch. Fail-closed, but only if these stay in step.
// ─────────────────────────────────────────────────────────────────────────────
const N_DRUGS = 3;
const N_LAB = 2;

// medicationCode → drugId, and the formulary the verifier pins policyDrugIds to.
const DRUG_ID: Record<string, number> = { metformin: 105, penicillin: 103, amoxicillin: 107 };
const DEFAULT_MAX_DOSAGE = '65535';

// Policies on these metrics become lab-policy slots; everything else folds into dosage limits.
const LAB_METRICS = new Set(['egfr', 'creatinine', 'alt', 'ast', 'inr']);

// DKG comparison operator → circuit op code for the required (safe) condition.
const OP_CODE: Record<string, number> = {
  '>=': 0, gte: 0, '>': 0,
  '<=': 1, lte: 1, '<': 1,
  '=': 2, '==': 2, eq: 2,
  '!=': 3, neq: 3,
};

// The prover's fallback when no policy for the prescribed drug carries a deltaMax.
const DEFAULT_VALID_FOR = 604800;

interface GovernedPolicy {
  id: string;
  medicationCode: string;
  clinicalCondition: string;
  comparisonOperator: string;
  threshold: number;
  deltaMax: number;
}

@Injectable()
export class GovernanceSyncService implements OnModuleInit {
  private readonly logger = new Logger(GovernanceSyncService.name);

  constructor(
    private readonly dkgService: DkgService,
    private readonly physicianRegistry: PhysicianRegistryService,
    private readonly contraindication: ContraindicationService,
    private readonly patientRecord: PatientRecordService,
    private readonly labRecord: LabRecordService,
    private readonly evm: EvmPublisherService,
  ) {}

  // On a clean stack there are no policies, so the vector is the padded/empty one. It still
  // has to be pushed once, or the chain holds no commitment and rejects everything.
  async onModuleInit(): Promise<void> {
    try {
      await this.syncAll();
    } catch (e: any) {
      // Boot must not hard-fail on a slow EVM container; the divergence is loud in the log
      // and self-heals on the next policy publish or an explicit POST /governance-sync.
      this.logger.error(
        `Initial governance sync failed — the chain has no commitment for the current DKG ` +
        `state and will reject every proof until it is pushed: ${e.message}`,
      );
    }
  }

  private stringToField(s: string): bigint {
    const h = createHash('sha256').update(s, 'utf8').digest('hex');
    return BigInt('0x' + h.slice(0, 62));
  }

  // Strips RDF-typed literals: "\"30\"^^xsd:decimal" → "30", "\"eGFR\"" → "eGFR".
  private clean(v: unknown): string {
    return String(v ?? '').replace(/\^\^.*$/, '').replace(/^"|"$/g, '').trim();
  }

  // Medication of a policy, derived EXACTLY the way ehealth-hospital-api derives it when it
  // builds the prover's request: from the policy id, not from appliesToMedication. A policy
  // whose medication cannot be inferred is dropped there, so it must be dropped here too —
  // otherwise the vector we commit contains a policy the prover never sees.
  private medicationOf(id: string): string {
    const s = id.toLowerCase();
    return s.includes('metformin') ? 'metformin'
      : s.includes('amoxicillin') ? 'amoxicillin'
        : s.includes('penicillin') ? 'penicillin'
          : '';
  }

  // The governed clinical policies, as the prover will see them.
  private async fetchPolicies(): Promise<GovernedPolicy[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?id ?name ?clinicalCondition ?comparisonOperator ?threshold ?deltaMax
      WHERE {
        ?id a rx:ClinicalPolicy ;
            rx:name ?name ;
            rx:clinicalCondition ?clinicalCondition ;
            rx:comparisonOperator ?comparisonOperator ;
            rx:threshold ?threshold ;
            rx:deltaMax ?deltaMax .
      }
    `;
    const result = (await this.dkgService.findAssets(sparql)) as any;
    const rows = result?.data?.data ?? result?.data ?? result ?? [];
    return (Array.isArray(rows) ? rows : [])
      .map((r: any) => {
        const id = this.clean(r.id ?? r['?id']);
        return {
          id,
          medicationCode: this.medicationOf(id),
          clinicalCondition: this.clean(r.clinicalCondition),
          comparisonOperator: this.clean(r.comparisonOperator),
          threshold: Number(this.clean(r.threshold)),
          deltaMax: Number(this.clean(r.deltaMax)),
        };
      })
      .filter((p) => p.medicationCode.length > 0);
  }

  // The complete governed lab-policy set in canonical order. MUST match selectLabPolicies in
  // ehealth-zkp-prover, tie-breaks included: two-sided ranges on one metric tie on
  // (medication, condition), and a different order is a different hash.
  private selectLabPolicies(policies: GovernedPolicy[]): GovernedPolicy[] {
    const norm = (s?: string) => (s ?? '').toLowerCase().trim();
    const lab = policies.filter(
      (p) => LAB_METRICS.has(norm(p.clinicalCondition)) && (DRUG_ID[norm(p.medicationCode)] ?? 0) !== 0,
    );
    lab.sort(
      (a, b) =>
        norm(a.medicationCode).localeCompare(norm(b.medicationCode)) ||
        norm(a.clinicalCondition).localeCompare(norm(b.clinicalCondition)) ||
        norm(a.comparisonOperator).localeCompare(norm(b.comparisonOperator)) ||
        Number(a.threshold) - Number(b.threshold),
    );
    if (lab.length > N_LAB) {
      throw new ServiceUnavailableException(
        `${lab.length} governed lab policies but the circuit has only N_LAB=${N_LAB} slots — ` +
        `the prover cannot build a witness for this state either. Recompile the circuit with a ` +
        `larger N_LAB before publishing another lab policy.`,
      );
    }
    return lab;
  }

  // The 16 governance values in the canonical order the verifier expects:
  // validCredentialRoot, policyDrugIds[3], maxDosages[3], contraindicationRoot,
  // labThreshold[2], labRequiredOp[2], labAppliesToDrug[2], labMetricIdPub[2].
  buildVector(policies: GovernedPolicy[]): string[] {
    const drugIds = this.contraindication.getDrugIds();

    const maxDosages = new Array(N_DRUGS).fill(DEFAULT_MAX_DOSAGE);
    for (const p of policies) {
      const cond = (p.clinicalCondition ?? '').toLowerCase().trim();
      if (LAB_METRICS.has(cond)) continue; // lab clause, not a dosage limit
      const code = (p.medicationCode ?? '').toLowerCase();
      const dIdx = code.includes('metformin') ? 0
        : code.includes('penicillin') ? 1
          : code.includes('amoxicillin') ? 2
            : -1;
      if (dIdx < 0) continue;
      maxDosages[dIdx] = Math.floor(Number(p.threshold)).toString();
    }

    const labThreshold = new Array(N_LAB).fill('0');
    const labRequiredOp = new Array(N_LAB).fill('0');
    const labAppliesToDrug = new Array(N_LAB).fill('0');
    const labMetricIdPub = new Array(N_LAB).fill('0');

    this.selectLabPolicies(policies).forEach((p, slot) => {
      const metric = (p.clinicalCondition ?? '').toLowerCase().trim();
      labThreshold[slot] = String(Math.floor(Number(p.threshold)));
      labRequiredOp[slot] = String(OP_CODE[(p.comparisonOperator ?? '').toLowerCase().trim()] ?? 0);
      labAppliesToDrug[slot] = String(DRUG_ID[(p.medicationCode ?? '').toLowerCase()] ?? 0);
      labMetricIdPub[slot] = this.stringToField(metric).toString();
    });

    return [
      this.physicianRegistry.getMerkleRoot(),
      ...drugIds.map(String),
      ...maxDosages,
      this.contraindication.getRoot(),
      ...labThreshold,
      ...labRequiredOp,
      ...labAppliesToDrug,
      ...labMetricIdPub,
    ];
  }

  // The prescription validity windows the prover can emit: every published deltaMax plus the
  // prover's own default. CLASS C rejects anything else, so this must move with the policies.
  private approvedValidFor(policies: GovernedPolicy[]): string[] {
    const set = new Set<string>([String(DEFAULT_VALID_FOR)]);
    for (const p of policies) {
      const d = Math.floor(Number(p.deltaMax));
      if (Number.isFinite(d) && d > 0) set.add(String(d));
    }
    return [...set];
  }

  // Push the governance vector + approved validity windows. `extraPolicies` carries a policy
  // that was just written to the DKG but may not be query-visible yet (indexing lag), so the
  // commitment is not computed from a stale view of the state.
  async syncGovernance(extraPolicies: GovernedPolicy[] = []): Promise<{ vector: string[]; hash: string; approvedValidFor: string[] }> {
    const fromDkg = await this.fetchPolicies();
    const byId = new Map(fromDkg.map((p) => [p.id, p]));
    for (const p of extraPolicies) byId.set(p.id, p);
    const policies = [...byId.values()];

    const vector = this.buildVector(policies);
    const { active } = await this.evm.postGovernanceVector(vector);

    const durations = this.approvedValidFor(policies);
    await this.evm.postApprovedValidFor(durations);

    this.logger.log(`Governance vector pushed on-chain: ${active} (${policies.length} policies, validFor ${durations.join('/')})`);
    return { vector, hash: active, approvedValidFor: durations };
  }

  // Push the CLASS B record-root sets. Replaces, so a superseded root stops being provable.
  async syncRootSets(): Promise<{ patientRecordRoots: string[]; labRecordRoots: string[] }> {
    const [patientRecordRoots, labRecordRoots] = await Promise.all([
      this.patientRecord.listRoots(),
      this.labRecord.listRoots(),
    ]);
    await this.evm.postRootSets({ patientRecordRoots, labRecordRoots, mode: 'replace' });
    this.logger.log(`Record roots pushed on-chain: ${patientRecordRoots.length} patient, ${labRecordRoots.length} lab`);
    return { patientRecordRoots, labRecordRoots };
  }

  // Read-only view of what the chain SHOULD hold for the current DKG state.
  async currentVector() {
    const policies = await this.fetchPolicies();
    return {
      vector: this.buildVector(policies),
      approvedValidFor: this.approvedValidFor(policies),
      policies: policies.length,
    };
  }

  async syncAll(extraPolicies: GovernedPolicy[] = []) {
    const governance = await this.syncGovernance(extraPolicies);
    const roots = await this.syncRootSets();
    return { ...governance, ...roots };
  }

  // Called right after a policy is anchored in the DKG, in the same operation.
  async syncAfterPolicyPublish(policy: { code: string; medicationCode: string; clinicalCondition: string; comparisonOperator: string; threshold: number; deltaMax: number }) {
    const id = `urn:rx:policy:${policy.code}`;
    return this.syncAll([{
      id,
      // Derived from the id, exactly as the read path will derive it.
      medicationCode: this.medicationOf(id),
      clinicalCondition: policy.clinicalCondition,
      comparisonOperator: policy.comparisonOperator,
      threshold: policy.threshold,
      deltaMax: policy.deltaMax,
    }].filter((p) => p.medicationCode.length > 0));
  }
}
