import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MedicalLicense } from 'src/providers/DKGConnector/ehealth/MedicalLIcense'; 
import { MedicalLicenseService } from './medical-license.service';

@ApiTags('MedicalLicense')
@Controller('/api/medical-license')
export class MedicalLicenseController {
  constructor(private readonly medicalLicenseService: MedicalLicenseService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() medicalLicense: MedicalLicense): Promise<any> {
    Logger.log({license: medicalLicense});

    return await this.medicalLicenseService.publish(medicalLicense);
  }

  @Get('/:medicalLicenseUuid')
  async getMedicalLicense(@Param('medicalLicenseUuid') medicalLicenseUuid: string): Promise<string> {
    return await this.medicalLicenseService.findByUUID(medicalLicenseUuid);
  }
}


