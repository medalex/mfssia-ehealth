import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RxGovernanceService } from './rx-governance.service';
import { CreateClinicalPolicyDto } from './dto/create-clinical-policy.dto';

@ApiTags('rx-governance')
@Controller('rx-governance/policies')
export class RxGovernanceController {
  constructor(private readonly service: RxGovernanceService) {}

  @Post('propose')
  @ApiOperation({
    summary: 'Propose a ClinicalPolicy to the DAO for approval',
    description: 'Opens a governance proposal (same lifecycle as bridges). Members then vote; on quorum the policy can be published.',
  })
  @ApiBody({ type: CreateClinicalPolicyDto })
  @ApiResponse({ status: 201, description: '{ proposalId, ... }' })
  async propose(@Body() dto: CreateClinicalPolicyDto) {
    return this.service.proposePolicy(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Publish a DAO-approved ClinicalPolicy to DKG',
    description: 'Anchors the policy — only if the DAO has approved it (403 otherwise). Set ?direct=true to bypass the gate (setup/genesis).',
  })
  @ApiBody({ type: CreateClinicalPolicyDto })
  @ApiResponse({ status: 201, description: 'UAL of the published policy asset' })
  @ApiResponse({ status: 403, description: 'Policy is not DAO-approved' })
  async publish(@Body() dto: CreateClinicalPolicyDto, @Query('direct') direct?: string) {
    return direct === 'true'
      ? this.service.publishPolicy(dto)
      : this.service.publishApprovedPolicy(dto);
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
