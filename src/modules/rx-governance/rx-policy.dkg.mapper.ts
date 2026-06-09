import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';
import { RxPolicyDkgDto } from './dto/rx-policy.dkg.dto';
import { RX_CONTEXT } from '@/providers/dkg/rx.context';

export class RxPolicyDkgMapper {
  static toDkgDto(dto: CreateClinicalPolicyDto): RxPolicyDkgDto {
    const asset: RxPolicyDkgDto = {
      '@context': RX_CONTEXT,
      '@type': 'rx:ClinicalPolicy',
      '@id': `urn:rx:policy:${dto.code}`,

      name: dto.name,
      appliesToMedication: `urn:rx:medication:${dto.medicationCode}`,
      clinicalCondition: dto.clinicalCondition,
      comparisonOperator: dto.comparisonOperator,
      threshold: dto.threshold,
      deltaMax: dto.deltaMax,
      publishedAt: new Date().toISOString(),
    };

    if (dto.conditionalThreshold) {
      asset.conditionalThreshold = dto.conditionalThreshold;
    }

    return asset;
  }
}
