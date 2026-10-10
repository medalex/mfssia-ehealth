import { Body, Controller, Get, Post, Query, Param } from '@nestjs/common';
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
  async getConsents(@Param('patientId') patientId: string) {
    return this.auditLog.trackRead('consent.documents', patientId, () =>
      this.service.getConsentDocuments(patientId),
    );
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
