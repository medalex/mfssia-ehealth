import { ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';
import { SemanticConflict } from './semantic-conflict.exception';
import { RxBridgeDkgMapper } from './rx-bridge.dkg.mapper';
import { lookupFactor } from './reference-conversions';

export interface NumericBridge {
  metric: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}

export interface EscalationResult {
  escalated: boolean;
  proposalId?: number;
  bridge: NumericBridge | { metric: string; fromUnit: string; toUnit: string; factor: null };
  hash: string;
  reason?: string;
}

@Injectable()
export class NumericBridgeService implements OnModuleInit {
  private readonly logger = new Logger(NumericBridgeService.name);
  private cache: { at: number; bridges: NumericBridge[] } | null = null;
  private readonly ttlMs = 30_000;

  // No bridges are seeded — they are added manually via POST /rx-governance/bridges
  // (or through the DAO conflict-resolution flow) during the demo.
  private readonly defaultBridges: NumericBridge[] = [];

  // DAO governance HTTP API (on the dedicated EVM). Reads/writes bridge approvals.
  private readonly evmUrl = process.env.EVM_URL ?? 'http://evm:3010';

  constructor(private readonly dkg: DkgService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaultBridges();
    } catch (e: any) {
      this.logger.warn(`NumericBridge seed skipped: ${e.message}`);
    }
  }

  // Deterministic bytes32 commitment for a bridge (metric|from|to|factor).
  // The DAO stores/checks this hash; the same value is used for propose + approval.
  bridgeHash(b: { metric: string; fromUnit: string; toUnit: string; factor: number | null }): string {
    const canon = `bridge|${b.metric}|${b.fromUnit}|${b.toUnit}|${b.factor ?? ''}`;
    return '0x' + createHash('sha256').update(canon).digest('hex');
  }

  /**
   * Auto-escalation: on a semantic conflict, look up a candidate conversion factor
   * from the reference table and propose the bridge to the DAO. Approval still
   * requires member votes — this only creates the proposal. If no candidate factor
   * is known, a proposal is still opened but flagged for a human expert to supply it.
   */
  async escalate(metric: string, fromUnit: string, toUnit: string): Promise<EscalationResult> {
    const factor = lookupFactor(metric, fromUnit, toUnit);
    const bridge = { metric, fromUnit, toUnit, factor };
    const hash = this.bridgeHash(bridge);

    try {
      const label = `bridge ${metric} ${fromUnit}→${toUnit}${factor !== null ? ` ×${factor}` : ' (needs expert)'}`;
      const resp = await fetch(`${this.evmUrl}/governance/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, member: 0, label, kind: 'bridge' }),
      });
      const body: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return { escalated: false, bridge, hash, reason: body?.error ?? `HTTP ${resp.status}` };
      }
      this.logger.warn(
        `escalated to DAO: bridge ${metric} ${fromUnit}->${toUnit} (factor ${factor ?? 'PENDING EXPERT'}) proposalId=${body.proposalId}`,
      );
      return {
        escalated: true,
        proposalId: body.proposalId,
        bridge,
        hash,
        reason: factor === null ? 'candidate factor unknown — needs a human expert' : undefined,
      };
    } catch (e: any) {
      this.logger.error(`DAO escalation failed: ${e.message}`);
      return { escalated: false, bridge, hash, reason: e.message };
    }
  }

  // Checks whether a bridge has been approved by the DAO (view call on the EVM).
  async isDaoApproved(bridge: NumericBridge): Promise<boolean> {
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

  /**
   * Publishes a bridge to the DKG only if the DAO has approved it. Used for
   * governance-added bridges (post-vote). Genesis bridges bypass this via the
   * ungated publishBridge() during seeding.
   */
  async publishApprovedBridge(bridge: NumericBridge): Promise<IAssetResponse> {
    if (!(await this.isDaoApproved(bridge))) {
      throw new ForbiddenException(
        `Bridge ${bridge.metric} ${bridge.fromUnit}->${bridge.toUnit} is not DAO-approved`,
      );
    }
    return this.publishBridge(bridge);
  }

  // Publishes a numeric bridge to the DKG as a public governance asset, then
  // clears the read cache so normalize() picks it up immediately.
  async publishBridge(bridge: NumericBridge): Promise<IAssetResponse> {
    this.logger.log(`Publishing NumericBridge ${bridge.metric} ${bridge.fromUnit} -> ${bridge.toUnit} to DKG`);
    const dto = RxBridgeDkgMapper.toDkgDto(bridge);

    // Retry: the ot-node transiently refuses connections mid-publish.
    const attempts = 3;
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await this.dkg.createAsset(dto);
        this.invalidate();
        this.logger.log(`Bridge anchored: UAL=${response.UAL}`);
        return response;
      } catch (e: any) {
        lastErr = e;
        this.logger.warn(`bridge publish attempt ${i + 1}/${attempts} failed: ${e.message}`);
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw lastErr;
  }

  // Publishes the default bridges, skipping any already present in the DKG (idempotent).
  private async seedDefaultBridges(): Promise<void> {
    const existing = await this.existingBridgeIds();
    for (const b of this.defaultBridges) {
      const id = RxBridgeDkgMapper.id(b);
      if (existing.has(id)) {
        this.logger.log(`NumericBridge "${id}" already in DKG — skipping`);
        continue;
      }
      try {
        await this.publishBridge(b);
      } catch (e: any) {
        this.logger.warn(`Failed to seed bridge "${id}": ${e.message}`);
      }
    }
  }

  private async existingBridgeIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    try {
      const sparql = `
        PREFIX rx: <https://mfssia.io/ontology/prescription#>
        SELECT ?id WHERE { ?id a rx:NumericBridge . }`;
      const res: any = await this.dkg.findAssets(sparql);
      const rows = res?.data ?? res ?? [];
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const raw = r?.id ?? r?.['?id'];
          const id = typeof raw === 'string' ? raw : raw?.value;
          if (id) ids.add(id);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Bridge existence check failed (will attempt seed): ${e.message}`);
    }
    return ids;
  }

  // Reads the rx:NumericBridge alignment axioms from theory T on the DKG.
  // The local DKG ot-node flaps (transient ECONNREFUSED and empty results for
  // already-anchored assets), so retry a few times before giving up. Data stays
  // DKG-sourced — this is resilience against ot-node flakiness, not a fallback.
  async queryBridges(): Promise<NumericBridge[]> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.bridges;

    const attempts = 4;
    let bridges: NumericBridge[] = [];
    for (let i = 0; i < attempts; i++) {
      try {
        bridges = await this.queryBridgesOnce();
        if (bridges.length > 0) break;
      } catch (e: any) {
        this.logger.warn(`bridge query attempt ${i + 1}/${attempts} failed: ${e.message}`);
      }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    // Cache only non-empty results — an empty response is likely a transient
    // ot-node hiccup, not a genuinely empty registry.
    if (bridges.length > 0) this.cache = { at: Date.now(), bridges };
    return bridges;
  }

  private async queryBridgesOnce(): Promise<NumericBridge[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?metric ?fromUnit ?toUnit ?factor WHERE {
        ?b a rx:NumericBridge ;
           rx:bridgeMetric ?metric ;
           rx:fromUnit ?fromUnit ;
           rx:toUnit ?toUnit ;
           rx:conversionFactor ?factor .
      }`;

    const res: any = await this.dkg.findAssets(sparql);
    const rows = res?.data ?? res ?? [];

    // SPARQL returns RDF literals like "glucose" and "18.016"^^xsd:decimal —
    // strip the surrounding quotes and any ^^datatype suffix.
    const clean = (v: any): string => {
      let s = typeof v === 'string' ? v : (v?.value ?? '');
      const i = s.indexOf('^^');
      if (i >= 0) s = s.slice(0, i);
      return s.replace(/^"|"$/g, '');
    };

    return (Array.isArray(rows) ? rows : [])
      .map((r: any) => ({
        metric: clean(r.metric ?? r['?metric']),
        fromUnit: clean(r.fromUnit ?? r['?fromUnit']),
        toUnit: clean(r.toUnit ?? r['?toUnit']),
        factor: Number(clean(r.factor ?? r['?factor'])),
      }))
      .filter((b) => b.metric && b.fromUnit && b.toUnit && Number.isFinite(b.factor));
  }

  invalidate(): void {
    this.cache = null;
  }

  /**
   * Normalises a lab value onto the governance-approved scale for its metric.
   *  - metric has no bridges (not unit-governed)  → value unchanged
   *  - value already on the governed scale        → value unchanged
   *  - a bridge with fromUnit === unit exists      → value * factor
   *  - present but unmapped unit                   → SemanticConflict (escalates to the DAO)
   */
  async normalize(metric: string, value: number, unit: string): Promise<number> {
    const forMetric = (await this.queryBridges()).filter((b) => b.metric === metric);
    if (forMetric.length === 0) return value; // metric not under numeric governance

    const governedUnit = forMetric[0].toUnit;
    if (unit === governedUnit) return value; // already on the governed scale

    const bridge = forMetric.find((b) => b.fromUnit === unit);
    if (bridge) {
      const normalized = value * bridge.factor;
      this.logger.log(`normalize ${metric}: ${value} ${unit} -> ${normalized} ${governedUnit}`);
      return normalized;
    }

    this.logger.warn(`semantic conflict: ${metric} '${unit}' has no bridge to '${governedUnit}'`);
    throw new SemanticConflict(metric, unit, governedUnit);
  }
}
