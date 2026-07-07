import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';
import { SemanticConflict } from './semantic-conflict.exception';
import { RxBridgeDkgMapper } from './rx-bridge.dkg.mapper';

export interface NumericBridge {
  metric: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
}

@Injectable()
export class NumericBridgeService implements OnModuleInit {
  private readonly logger = new Logger(NumericBridgeService.name);
  private cache: { at: number; bridges: NumericBridge[] } | null = null;
  private readonly ttlMs = 30_000;

  // Governance-approved genesis bridges, seeded into the DKG on startup so
  // normalize() works out of the box and survives a DKG reset. Mirrors the
  // rx:NumericBridge individuals in ontology/dkg-governance-theory-T.ttl.
  private readonly defaultBridges: NumericBridge[] = [
    { metric: 'creatinine', fromUnit: 'umol/L', toUnit: 'mg/dL', factor: 0.0113122 },
    { metric: 'glucose', fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 18.016 },
  ];

  constructor(private readonly dkg: DkgService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaultBridges();
    } catch (e: any) {
      this.logger.warn(`NumericBridge seed skipped: ${e.message}`);
    }
  }

  // Publishes a numeric bridge to the DKG as a public governance asset, then
  // clears the read cache so normalize() picks it up immediately.
  async publishBridge(bridge: NumericBridge): Promise<IAssetResponse> {
    this.logger.log(`Publishing NumericBridge ${bridge.metric} ${bridge.fromUnit} -> ${bridge.toUnit} to DKG`);
    const dto = RxBridgeDkgMapper.toDkgDto(bridge);
    const response = await this.dkg.createAsset(dto);
    this.invalidate();
    this.logger.log(`Bridge anchored: UAL=${response.UAL}`);
    return response;
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
  async queryBridges(): Promise<NumericBridge[]> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.bridges;

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
    const val = (v: any) => (typeof v === 'string' ? v : v?.value);

    const bridges: NumericBridge[] = (Array.isArray(rows) ? rows : [])
      .map((r: any) => ({
        metric: val(r.metric ?? r['?metric']),
        fromUnit: val(r.fromUnit ?? r['?fromUnit']),
        toUnit: val(r.toUnit ?? r['?toUnit']),
        factor: Number(val(r.factor ?? r['?factor'])),
      }))
      .filter((b) => b.metric && b.fromUnit && b.toUnit && Number.isFinite(b.factor));

    this.cache = { at: Date.now(), bridges };
    return bridges;
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
