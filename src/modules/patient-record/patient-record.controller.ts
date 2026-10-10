import { BadRequestException, Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PatientRecordService } from './patient-record.service';
import { AuditLogService, validateRunId } from '@/modules/audit-log/audit-log.service';
import { PhysicianAccessService } from '@/modules/physician-access/physician-access.service';

const CUSTODIAN_ATTRIBUTE_MAP: Record<string, string[]> = {
  'hospital-1': ['allergies'],
  'lab-a': ['lab:*'],
  'lab-b': ['lab:*'],
};

const supportsAttribute = (custodianId: string, attribute: string): boolean => {
  const capabilities = CUSTODIAN_ATTRIBUTE_MAP[custodianId] ?? [];
  return attribute === 'allergies' ? capabilities.includes('allergies') : capabilities.includes('lab:*');
};

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
    @Query('runId') runId?: string,
  ) {
    const resolvedRunId = validateRunId(runId);
    if (!doctorId || !custodianId) {
      throw new BadRequestException({ error: 'invalid_request', reason: 'doctorId and custodianId are required' });
    }
    // A confirmed_absent outcome means the custodian has published no allergy record for this patient;
    // it does not prove the overall patient record is complete.
    if (!supportsAttribute(custodianId, 'allergies')) {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'not_custodian', patientId, doctorId,
        organizationId: null, custodianId, resource: 'patient-record.proof', reason: 'not_custodian',
        details: { expectedCustodianId: 'hospital-1', actualCustodianId: custodianId },
        runId: resolvedRunId ?? null,
      });
      throw new ForbiddenException({
        error: 'not_custodian',
        reason: 'not_custodian',
        auditEventId: event.id,
      });
    }
    let decision;
    try {
      decision = await this.access.checkAccess(doctorId, patientId, custodianId, resolvedRunId);
    } catch (error: any) {
      await this.auditLog.record({
        eventType: 'data.read', outcome: 'unavailable', patientId, doctorId,
        organizationId: null, custodianId, resource: 'patient-record.proof', reason: 'unavailable',
        details: { error: error?.message ?? 'Access check unavailable' },
        runId: resolvedRunId ?? null,
      });
      throw error;
    }
    if (!decision.access) {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'access_denied', patientId, doctorId,
        organizationId: decision.organizationId, custodianId, resource: 'patient-record.proof',
        reason: 'access_denied', details: { accessReason: decision.reason },
        runId: resolvedRunId ?? null,
      });
      throw new ForbiddenException({ error: 'access_denied', reason: decision.reason, auditEventId: event.id });
    }
    const { value } = await this.auditLog.trackRead({
      patientId, doctorId, organizationId: decision.organizationId, custodianId,
      resource: 'patient-record.proof', runId: resolvedRunId ?? null,
    }, () => this.service.getProof(patientId));
    return value;
  }
}
