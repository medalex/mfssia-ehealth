import { BadRequestException, Controller, ForbiddenException, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LabRecordService } from './lab-record.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { PhysicianAccessService } from '@/modules/physician-access/physician-access.service';

@ApiTags('lab-record')
@Controller('lab-record')
export class LabRecordController {
  constructor(
    private readonly service: LabRecordService,
    private readonly auditLog: AuditLogService,
    private readonly access: PhysicianAccessService,
  ) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All labRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no lab results).',
  })
  listRoots() {
    return this.service.listRoots();
  }

  @Get(':patientId')
  @ApiOperation({
    summary: 'Patient lab record from DKG: Merkle root + per-measurement membership proofs',
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
    let decision;
    try {
      decision = await this.access.checkAccess(doctorId, patientId, custodianId);
    } catch (error: any) {
      await this.auditLog.record({
        eventType: 'data.read', outcome: 'unavailable', patientId, doctorId,
        organizationId: null, custodianId, resource: 'lab-record.proof', reason: 'unavailable',
        details: { error: error?.message ?? 'Access check unavailable' },
      });
      throw error;
    }
    if (!decision.access) {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'access_denied', patientId, doctorId,
        organizationId: decision.organizationId, custodianId, resource: 'lab-record.proof',
        reason: 'access_denied', details: { accessReason: decision.reason },
      });
      throw new ForbiddenException({ error: 'access_denied', reason: decision.reason, auditEventId: event.id });
    }
    const { value } = await this.auditLog.trackRead({
      patientId, doctorId, organizationId: decision.organizationId, custodianId,
      resource: 'lab-record.proof',
    }, () => this.service.getProof(patientId, true, custodianId));
    return value;
  }
}
