import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';
import { RxPolicyDkgMapper } from './rx-policy.dkg.mapper';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';
import { ComparisonOperator } from '@/common/enums/comparison-operator.enum';

@Injectable()
export class RxGovernanceService implements OnModuleInit {
  private readonly logger = new Logger(RxGovernanceService.name);

  // Governance-approved clinical policies seeded into the DKG on startup, so the circuit's
  // dosage (P3) and lab (P6) policies actually enforce out of the box and survive a DKG
  // reset. Dosage maxima keep the standard demo (Metformin dose 8) passing.
  private readonly defaultPolicies: CreateClinicalPolicyDto[] = [
    {
      code: 'metformin-egfr',
      name: 'Metformin requires eGFR >= 30',
      medicationCode: 'metformin',
      clinicalCondition: 'eGFR',
      comparisonOperator: ComparisonOperator.GTE,
      threshold: 30,
      deltaMax: 7776000, // 90 days
    },
    {
      code: 'metformin-maxdose',
      name: 'Metformin max dose 20',
      medicationCode: 'metformin',
      clinicalCondition: 'maxDose',
      comparisonOperator: ComparisonOperator.LTE,
      threshold: 20,
      deltaMax: 7776000,
    },
    {
      code: 'penicillin-maxdose',
      name: 'Penicillin max dose 10',
      medicationCode: 'penicillin',
      clinicalCondition: 'maxDose',
      comparisonOperator: ComparisonOperator.LTE,
      threshold: 10,
      deltaMax: 7776000,
    },
    {
      code: 'amoxicillin-maxdose',
      name: 'Amoxicillin max dose 16',
      medicationCode: 'amoxicillin',
      clinicalCondition: 'maxDose',
      comparisonOperator: ComparisonOperator.LTE,
      threshold: 16,
      deltaMax: 7776000,
    },
  ];

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
