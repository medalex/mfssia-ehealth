import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';
import { TerminologyConflict } from './terminology-conflict.exception';
import { RxTerminologyDkgMapper } from './rx-terminology.dkg.mapper';
import { lookupAlignment } from './terminology-reference';

export interface TerminologyBridge {
  system: string; // source coding system, e.g. "AllergyDB-Local"
  code: string; // source code, e.g. "PCN-001"
  term?: string; // human-readable label
  alignsTo: string; // governed rx concept IRI, e.g. "rx:Penicillin"
}

export interface AlignEscalation {
  escalated: boolean;
  proposalId?: number;
  bridge: TerminologyBridge | { system: string; code: string; term?: string; alignsTo: null };
  hash: string;
  reason?: string;
}

// Governance for terminology alignment (rx:alignsTo). Mirrors NumericBridgeService: a
// change to theory T (a new alignment axiom) must be proposed, voted and approved by the
// DAO before it is published to the DKG.
@Injectable()
export class TerminologyBridgeService {
  private readonly logger = new Logger(TerminologyBridgeService.name);
  private cache: { at: number; bridges: TerminologyBridge[] } | null = null;
  private readonly ttlMs = 30_000;

  // DAO governance HTTP API (on the dedicated EVM).
  private readonly evmUrl = process.env.EVM_URL ?? 'http://evm:3010';

  constructor(private readonly dkg: DkgService) {}

  // Deterministic bytes32 commitment for an alignment (system|code|alignsTo). The DAO
  // stores/checks this hash; the same value is used for propose + approval.
  bridgeHash(b: { system: string; code: string; alignsTo: string | null }): string {
    const canon = `terminology|${b.system}|${b.code}|${b.alignsTo ?? ''}`;
    return '0x' + createHash('sha256').update(canon).digest('hex');
  }

  /**
   * Auto-escalation: on a terminological conflict, look up a candidate governed concept
   * from the reference table and propose the alignment to the DAO. Approval still requires
   * member votes — this only creates the proposal.
   */
  async escalate(system: string, code: string, term?: string): Promise<AlignEscalation> {
    const alignsTo = lookupAlignment(system, code);
    const bridge = { system, code, term, alignsTo };
    const hash = this.bridgeHash(bridge);

    try {
      const label = `align ${system}:${code} → ${alignsTo ?? '(needs expert)'}`;
      const resp = await fetch(`${this.evmUrl}/governance/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, member: 0, label, kind: 'terminology' }),
      });
      const body: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return { escalated: false, bridge, hash, reason: body?.error ?? `HTTP ${resp.status}` };
      }
      this.logger.warn(
        `escalated to DAO: alignment ${system}:${code} -> ${alignsTo ?? 'PENDING EXPERT'} proposalId=${body.proposalId}`,
      );
      return {
        escalated: true,
        proposalId: body.proposalId,
        bridge,
        hash,
        reason: alignsTo === null ? 'candidate concept unknown — needs a human expert' : undefined,
      };
    } catch (e: any) {
      this.logger.error(`DAO escalation failed: ${e.message}`);
      return { escalated: false, bridge, hash, reason: e.message };
    }
  }

  // Checks whether an alignment has been approved by the DAO (view call on the EVM).
  async isDaoApproved(bridge: TerminologyBridge): Promise<boolean> {
    try {
      const resp = await fetch(`${this.evmUrl}/governance/approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: this.bridgeHash(bridge) }),
      });
      const body: any = await resp.json().catch(() => ({}));
      return resp.ok && body?.approved === true;
    } catch (e: any) {
      this.logger.error(`DAO approval check failed: ${e.message}`);
      return false;
    }
  }

  // A DAO member proposes a fully-specified alignment for approval — the manual
  // counterpart to escalate() (which is auto-triggered by a conflict).
  async proposeBridge(bridge: TerminologyBridge, member = 0): Promise<any> {
    const hash = this.bridgeHash(bridge);
    const label = `align ${bridge.system}:${bridge.code} → ${bridge.alignsTo}`;
    const resp = await fetch(`${this.evmUrl}/governance/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, member, label, kind: 'terminology' }),
    });
    const body: any = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new ForbiddenException(body?.error ?? `propose failed (HTTP ${resp.status})`);
    this.logger.warn(`alignment ${bridge.system}:${bridge.code} proposed to DAO: proposalId=${body.proposalId}`);
    return body;
  }

  // Publishes an alignment to the DKG only if the DAO has approved it.
  async publishApprovedBridge(bridge: TerminologyBridge): Promise<IAssetResponse> {
    if (!(await this.isDaoApproved(bridge))) {
      throw new ForbiddenException(`Alignment ${bridge.system}:${bridge.code} is not DAO-approved`);
    }
    return this.publishBridge(bridge);
  }

  // Publishes a terminology alignment to the DKG as a public governance asset, then clears
  // the read cache so align() picks it up immediately.
  async publishBridge(bridge: TerminologyBridge): Promise<IAssetResponse> {
    this.logger.log(`Publishing TerminologyBridge ${bridge.system}:${bridge.code} -> ${bridge.alignsTo} to DKG`);
    const dto = RxTerminologyDkgMapper.toDkgDto(bridge);

    const attempts = 3;
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await this.dkg.createAsset(dto);
        this.invalidate();
        this.logger.log(`Alignment anchored: UAL=${response.UAL}`);
        return response;
      } catch (e: any) {
        lastErr = e;
        this.logger.warn(`alignment publish attempt ${i + 1}/${attempts} failed: ${e.message}`);
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw lastErr;
  }

  // Reads the rx:TerminologyBridge alignment axioms from theory T on the DKG, with retry
  // against transient ot-node flakiness (same rationale as the numeric bridge query).
  async queryBridges(): Promise<TerminologyBridge[]> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.bridges;

    const attempts = 4;
    let bridges: TerminologyBridge[] = [];
    for (let i = 0; i < attempts; i++) {
      try {
        bridges = await this.queryBridgesOnce();
        if (bridges.length > 0) break;
      } catch (e: any) {
        this.logger.warn(`alignment query attempt ${i + 1}/${attempts} failed: ${e.message}`);
      }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    if (bridges.length > 0) this.cache = { at: Date.now(), bridges };
    return bridges;
  }

  private async queryBridgesOnce(): Promise<TerminologyBridge[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?system ?code ?term ?alignsTo WHERE {
        ?b a rx:TerminologyBridge ;
           rx:alignsSystem ?system ;
           rx:alignsCode ?code ;
           rx:alignsTo ?alignsTo .
        OPTIONAL { ?b rx:alignsTerm ?term }
      }`;

    const res: any = await this.dkg.findAssets(sparql);
    const rows = res?.data ?? res ?? [];

    // Strip RDF literal quotes / ^^datatype and IRI angle brackets.
    const clean = (v: any): string => {
      let s = typeof v === 'string' ? v : (v?.value ?? '');
      const i = s.indexOf('^^');
      if (i >= 0) s = s.slice(0, i);
      return s.replace(/^"|"$/g, '').replace(/^<|>$/g, '');
    };

    return (Array.isArray(rows) ? rows : [])
      .map((r: any) => ({
        system: clean(r.system ?? r['?system']),
        code: clean(r.code ?? r['?code']),
        term: clean(r.term ?? r['?term']),
        alignsTo: clean(r.alignsTo ?? r['?alignsTo']),
      }))
      .filter((b) => b.system && b.code && b.alignsTo);
  }

  invalidate(): void {
    this.cache = null;
  }

  private canon(s: string): string {
    return String(s ?? '').trim().toLowerCase();
  }

  /**
   * Resolves a (system, code) clinical concept to its governed rx concept:
   *  - an rx:alignsTo axiom exists  → the governed concept IRI
   *  - no axiom in T                → TerminologyConflict (escalates to the DAO)
   * The governed system ("SNOMED-CT" here) is treated as canonical: codes in it that
   * are already governed pass through unchanged is the caller's decision — this method
   * only consults the alignment registry.
   */
  async align(system: string, code: string, term?: string): Promise<string> {
    const bridges = await this.queryBridges();
    const hit = bridges.find((b) => this.canon(b.system) === this.canon(system) && this.canon(b.code) === this.canon(code));
    if (hit) {
      this.logger.log(`align ${system}:${code} -> ${hit.alignsTo}`);
      return hit.alignsTo;
    }
    this.logger.warn(`terminological conflict: ${system}:${code} has no alignment axiom`);
    throw new TerminologyConflict(system, code, term);
  }
}
