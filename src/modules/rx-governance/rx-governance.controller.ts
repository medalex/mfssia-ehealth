import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RxGovernanceService } from './rx-governance.service';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';

@ApiTags('rx-governance')
@Controller('rx-governance/policies')
export class RxGovernanceController {
  constructor(private readonly service: RxGovernanceService) {}

  @Post()
  @ApiOperation({
    summary: 'Publish a ClinicalPolicy Pol(m,t,op,θ) to DKG',
    description: 'Publishes governance policy as a public DKG asset. Returns the UAL.',
  })
  @ApiBody({ type: CreateClinicalPolicyDto })
  @ApiResponse({ status: 201, description: 'UAL of the published policy asset' })
  async publish(@Body() dto: CreateClinicalPolicyDto) {
    return this.service.publishPolicy(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Query all ClinicalPolicies from DKG via SPARQL',
    description: 'Returns all rx:ClinicalPolicy assets from the DKG graph.',
  })
  @ApiResponse({ status: 200 })
  async query() {
    return this.service.queryPolicies();
  }
}
