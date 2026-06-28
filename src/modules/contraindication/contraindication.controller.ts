import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContraindicationService } from './contraindication.service';

@ApiTags('contraindication')
@Controller('contraindication')
export class ContraindicationController {
  constructor(private readonly service: ContraindicationService) {}

  @Get('root')
  @ApiOperation({ summary: 'Contraindication closure Merkle root (published to DKG)' })
  getRoot() {
    return { contraindicationRoot: this.service.getRoot() };
  }

  @Get('drugs')
  @ApiOperation({ summary: 'Governance drug formulary (real drug ids) for verifier pinning' })
  getDrugs() {
    return { drugIds: this.service.getDrugIds() };
  }

  @Get('proof')
  @ApiOperation({
    summary: 'Membership proof that (substanceId, drugId) → value is in the committed closure',
  })
  @ApiQuery({ name: 'substance', description: 'substanceId (0=Metformin,1=Penicillin,2=Amoxicillin)' })
  @ApiQuery({ name: 'drug', description: 'drugId (same index space)' })
  getProof(
    @Query('substance', ParseIntPipe) substance: number,
    @Query('drug', ParseIntPipe) drug: number,
  ) {
    return this.service.getProof(substance, drug);
  }
}
