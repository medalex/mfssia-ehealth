import { BadRequestException, Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PatientRecordService } from './patient-record.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { PhysicianAccessService } from '@/modules/physician-access/physician-access.service';

@ApiTags('patient-record')
@Controller('patient-record')
export class PatientRecordController {
  constructor(
    private readonly service: PatientRecordService,
    private readonly auditLog: AuditLogService,
    private readonly access: PhysicianAccessService,
  ) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All patientRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no allergies).',
  })
  listRoots() {
    return this.service.listRoots();
  }

  @Get(':patientId/proof')
  @ApiOperation({
    summary:
      'Patient allergy Merkle proof (patientRecordRoot + leaves + membership) built from DKG allergies',
  })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  async getProof(
    @Param('patientId') patientId: string,
    @Query('doctorId') doctorId: string,
    @Query('custodianId') custodianId: string,
  ) {
    if (!doctorId || !custodianId) {
      throw new BadRequestException({ error: 'invalid_request', reason: 'doctorId and custodianId are required' });
    }
    // TODO: add rx:hasSource to allergy records and replace this pilot owner assignment.
    if (custodianId !== 'hospital-1') {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'not_custodian', patientId, doctorId,
        organizationId: null, custodianId, resource: 'patient-record.proof', reason: 'not_custodian',
        details: { expectedCustodianId: 'hospital-1' },
      });
      throw new ForbiddenException({
        error: 'not_custodian',
        reason: 'not_custodian',
        auditEventId: event.id,
      });
    }
    let decision;
    try {
      decision = await this.access.checkAccess(doctorId, patientId, custodianId);
    } catch (error: any) {
      await this.auditLog.record({
        eventType: 'data.read', outcome: 'unavailable', patientId, doctorId,
        organizationId: null, custodianId, resource: 'patient-record.proof', reason: 'unavailable',
        details: { error: error?.message ?? 'Access check unavailable' },
      });
      throw error;
    }
    if (!decision.access) {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'access_denied', patientId, doctorId,
        organizationId: decision.organizationId, custodianId, resource: 'patient-record.proof',
        reason: 'access_denied', details: { accessReason: decision.reason },
      });
      throw new ForbiddenException({ error: 'access_denied', reason: decision.reason, auditEventId: event.id });
    }
    const { value } = await this.auditLog.trackRead({
      patientId, doctorId, organizationId: decision.organizationId, custodianId,
      resource: 'patient-record.proof',
    }, () => this.service.getProof(patientId));
    return value;
  }
}
