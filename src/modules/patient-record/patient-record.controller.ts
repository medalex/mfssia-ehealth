import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PatientRecordService } from './patient-record.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

@ApiTags('patient-record')
@Controller('patient-record')
export class PatientRecordController {
  constructor(
    private readonly service: PatientRecordService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All patientRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no allergies).',
  })
  listRoots() {
    return this.auditLog.trackRead('patient-record.roots', null, () => this.service.listRoots());
  }

  @Get(':patientId/evidence-status')
  @ApiOperation({ summary: 'Allergy evidence state: present, confirmed absent, or unknown' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getEvidenceStatus(@Param('patientId') patientId: string) {
    return this.auditLog.trackRead('patient-record.evidence-status', patientId, () =>
      this.service.getEvidenceStatus(patientId),
    );
  }

  @Get(':patientId/proof')
  @ApiOperation({
    summary:
      'Patient allergy Merkle proof (patientRecordRoot + leaves + membership) built from DKG allergies',
  })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getProof(@Param('patientId') patientId: string) {
    return this.auditLog.trackRead('patient-record.proof', patientId, () => this.service.getProof(patientId));
  }
}
