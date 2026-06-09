import { Injectable, Logger } from '@nestjs/common';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';
import { RxPolicyDkgMapper } from './rx-policy.dkg.mapper';
import { DkgService } from '@/providers/dkg/dkg.service';
import { IAssetResponse } from '@/interfaces/IAssetResponse';

@Injectable()
export class RxGovernanceService {
  private readonly logger = new Logger(RxGovernanceService.name);

  constructor(private readonly dkgService: DkgService) {}

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
}
