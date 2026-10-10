import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { validateRunId } from '@/modules/audit-log/audit-log.service';
import { EvidenceStatusService } from './evidence-status.service';

@ApiTags('evidence-status')
@Controller('evidence-status')
export class EvidenceStatusController {
  constructor(private readonly service: EvidenceStatusService) {}

  @Get(':patientId')
  @ApiOperation({ summary: 'Evidence state scoped to an authorized custodian' })
  getStatus(
    @Param('patientId') patientId: string,
    @Query('doctorId') doctorId: string,
    @Query('custodianId') custodianId: string,
    @Query('attribute') attribute: string,
    @Query('runId') runId?: string,
  ) {
    return this.service.getStatus(patientId, doctorId, custodianId, attribute, validateRunId(runId));
  }
}