import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';
import { RxPolicyDkgMapper } from './rx-policy.dkg.mapper';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';

@Injectable()
export class RxGovernanceService implements OnModuleInit {
  private readonly logger = new Logger(RxGovernanceService.name);

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
