import { ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';
import { RxPolicyDkgMapper } from './rx-policy.dkg.mapper';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';

@Injectable()
export class RxGovernanceService implements OnModuleInit {
  private readonly logger = new Logger(RxGovernanceService.name);

  // DAO governance HTTP API (on the dedicated EVM). Same lifecycle as bridges:
  // a change to theory T (a clinical policy) must be proposed, voted and approved.
  private readonly evmUrl = process.env.EVM_URL ?? 'http://evm:3010';

  // Fields the EVM hashes into the on-chain commitment (must match ehealth-evm policyHash).
  private policyFields(dto: CreateClinicalPolicyDto) {
    return {
      code: dto.code,
      medicationCode: dto.medicationCode,
      clinicalCondition: dto.clinicalCondition,
      comparisonOperator: dto.comparisonOperator,
      threshold: dto.threshold,
    };
  }

  // A DAO member proposes a clinical policy for approval.
  async proposePolicy(dto: CreateClinicalPolicyDto, member = 0): Promise<any> {
    const resp = await fetch(`${this.evmUrl}/governance/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...this.policyFields(dto), member, kind: 'policy', label: `policy ${dto.code}` }),
    });
    const body: any = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new ForbiddenException(body?.error ?? `propose failed (HTTP ${resp.status})`);
    this.logger.warn(`policy "${dto.code}" escalated to DAO: proposalId=${body.proposalId}`);
    return body;
  }

  // Checks whether a policy has been approved by the DAO (view call on the EVM).
  async isDaoApproved(dto: CreateClinicalPolicyDto): Promise<boolean> {
    try {
      const resp = await fetch(`${this.evmUrl}/governance/approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.policyFields(dto)),
      });
      const body: any = await resp.json().catch(() => ({}));
      return resp.ok && body?.approved === true;
    } catch (e: any) {
      this.logger.error(`DAO approval check failed: ${e.message}`);
      return false;
    }
  }

  // Publishes a policy to the DKG only if the DAO has approved it.
  async publishApprovedPolicy(dto: CreateClinicalPolicyDto): Promise<IAssetResponse> {
    if (!(await this.isDaoApproved(dto))) {
      throw new ForbiddenException(`ClinicalPolicy "${dto.code}" is not DAO-approved`);
    }
    return this.publishPolicy(dto);
  }

  // No clinical policies are seeded — they are published live during the demo via
  // POST /rx-governance/policies (governance UI), so "add a policy → it starts
  // enforcing in the ZKP" can be shown end-to-end.
  private readonly defaultPolicies: CreateClinicalPolicyDto[] = [];

  constructor(private readonly dkgService: DkgService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaultPolicies();
    } catch (e: any) {
      this.logger.warn(`Clinical-policy seed skipped: ${e.message}`);
    }
  }

  async publishPolicy(dto: CreateClinicalPolicyDto): Promise<IAssetResponse> {
    this.logger.log(`Publishing ClinicalPolicy "${dto.code}" to DKG`);
    const dkgDto = RxPolicyDkgMapper.toDkgDto(dto);
    const response = await this.dkgService.createAsset(dkgDto);
    this.logger.log(`Policy "${dto.code}" anchored: UAL=${response.UAL}`);
    return response;
  }

  async queryPolicies(): Promise<unknown> {
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
    return this.dkgService.findAssets(sparql);
  }

  // Publishes the default policies, skipping any already present in the DKG (idempotent).
  private async seedDefaultPolicies(): Promise<void> {
    const existing = await this.existingPolicyIds();
    for (const p of this.defaultPolicies) {
      const id = `urn:rx:policy:${p.code}`;
      if (existing.has(id)) {
        this.logger.log(`ClinicalPolicy "${p.code}" already in DKG — skipping`);
        continue;
      }
      try {
        await this.publishPolicy(p);
      } catch (e: any) {
        this.logger.warn(`Failed to seed policy "${p.code}": ${e.message}`);
      }
    }
  }

  private async existingPolicyIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    try {
      const res: any = await this.queryPolicies();
      const rows = res?.data ?? res ?? [];
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const raw = r?.id ?? r?.['?id'];
          const id = typeof raw === 'string' ? raw : raw?.value;
          if (id) ids.add(id);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Policy existence check failed (will attempt seed): ${e.message}`);
    }
    return ids;
  }
}
