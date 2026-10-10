import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LabRecordService } from './lab-record.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

@ApiTags('lab-record')
@Controller('lab-record')
export class LabRecordController {
  constructor(
    private readonly service: LabRecordService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All labRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no lab results).',
  })
  listRoots() {
    return this.auditLog.trackRead('lab-record.roots', null, () => this.service.listRoots());
  }

  @Get(':patientId')
  @ApiOperation({
    summary: 'Patient lab record from DKG: Merkle root + per-measurement membership proofs',
  })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getProof(@Param('patientId') patientId: string) {
    return this.auditLog.trackRead('lab-record.proof', patientId, () => this.service.getProof(patientId));
  }
}
