import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MedicalLicense } from 'src/modules/medical-license/medical-license.entity'; 
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
  async getMedicalLicense(@Param('medicalLicenseUuid') medicalLicenseUuid: string): Promise<MedicalLicense> {
    return await this.medicalLicenseService.findByUuid(medicalLicenseUuid);
  }

  @Get('/owner/:ownerUuid')
  async getMedicalLicenseByOwner(@Param('ownerUuid') ownerUuid: string): Promise<MedicalLicense> {
    return await this.medicalLicenseService.findByOwner(ownerUuid);
  }
}


