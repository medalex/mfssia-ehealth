import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SecurityLicenseService } from './security-license.service';
import { SecurityLicense } from 'src/providers/DKGConnector/SecurityLicense';



@ApiTags('SecurityLicense')
@Controller('/api/security-license')
export class SecurityLicenseController {
  constructor(private readonly securityLicenseService: SecurityLicenseService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() securityLicense: SecurityLicense): Promise<any> {
    Logger.log({license: securityLicense});

    return await this.securityLicenseService.publish(securityLicense);
  }

  @Get('/:securityLicenseUuid')
  async get(@Param('securityLicenseUuid') securityLicenseUuid: string): Promise<SecurityLicense> {
    return await this.securityLicenseService.findByUuid(securityLicenseUuid);
  }
}


