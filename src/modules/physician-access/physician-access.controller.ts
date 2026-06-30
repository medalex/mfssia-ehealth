import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PhysicianAccessService } from './physician-access.service';
import { CheckAccessDto } from './dto/check-access.dto';

@ApiTags('physician-access')
@Controller('physician-access')
export class PhysicianAccessController {
  constructor(private readonly service: PhysicianAccessService) {}

  @Get('recent')
  @ApiOperation({ summary: 'Recent ConsentAccessSet challenge/response decisions (latest first)' })
  recent(@Query('limit') limit?: string) {
    return this.service.getRecent(limit ? Number(limit) : 10);
  }

  @Post('check')
  @ApiOperation({
    summary:
      'Run the ConsentAccessSet (ALL_MANDATORY) for a physician↔patient pair: authentication + consent authorization',
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
        reason: 'Access granted: physician authenticated and consent covers organization',
      },
    },
  })
  check(@Body() dto: CheckAccessDto) {
    return this.service.checkAccess(dto.doctorId, dto.patientId);
  }
}
