import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PhysicianAccessService } from './physician-access.service';
import { CheckAccessDto } from './dto/check-access.dto';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

@ApiTags('physician-access')
@Controller('physician-access')
export class PhysicianAccessController {
  constructor(
    private readonly service: PhysicianAccessService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('recent')
  @ApiOperation({ summary: 'Recent ConsentAccessSet challenge/response decisions (latest first)' })
  async recent(@Query('limit') limit?: string) {
    return this.service.getRecent(limit ? Number(limit) : 10);
  }

  @Get('consents/:patientId')
  @ApiOperation({ summary: 'DataSharingConsent documents (reconstructed from DKG) for a patient' })
  async getConsents(
    @Param('patientId') patientId: string,
    @Query('doctorId') doctorId: string,
    @Query('custodianId') custodianId: string,
  ) {
    if (!doctorId || !custodianId) throw new BadRequestException('doctorId and custodianId are required');
    const decision = await this.service.checkAccess(doctorId, patientId, custodianId);
    if (!decision.access) {
      const event = await this.auditLog.record({
        eventType: 'data.read', outcome: 'access_denied', patientId, doctorId,
        organizationId: decision.organizationId, custodianId, resource: 'consent.documents',
        reason: 'access_denied', details: { accessReason: decision.reason },
      });
      throw new ForbiddenException({ error: 'access_denied', reason: decision.reason, auditEventId: event.id });
    }
    const { value } = await this.auditLog.trackRead({
      patientId, doctorId, organizationId: decision.organizationId, custodianId,
      resource: 'consent.documents',
    }, () => this.service.getConsentDocuments(patientId));
    return value;
  }

  @Get('challenge-docs')
  @ApiOperation({ summary: 'Challenge documents for ConsentAccessSet (governance side)' })
  getChallengeDocs() {
    return this.service.getChallengeDocuments();
  }

  @Post('check')
  @ApiOperation({
    summary:
      'Run ConsentAccessSet v1.1 for a physician, patient, and custodian: authentication + consent authorization',
  })
  @ApiResponse({
    status: 200,
    description: 'Access decision with per-challenge results',
    schema: {
      example: {
        access: true,
        authn: true,
        authz: true,
        challengeSet: 'ConsentAccessSet',
        nonce: '0x...',
        organizationId: 'hospital-1',
        custodianId: 'lab-a',
        reason: 'Access granted: physician authenticated and consent covers organization and custodian',
      },
    },
  })
  check(@Body() dto: CheckAccessDto) {
    return this.service.checkAccess(dto.doctorId, dto.patientId, dto.custodianId);
  }
}
