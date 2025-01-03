import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MedicalLicense } from 'src/modules/medical-license/medical-license.entity';
import { MedicalLicenseFacadeService } from './medical-license-facade.service';

@ApiTags('MedicalLicense')
@Controller('/api/medical-license')
export class MedicalLicenseController {
  constructor(   
    private readonly medicalFacadeService: MedicalLicenseFacadeService) {    
  }

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() medicalLicense: MedicalLicense): Promise<any> {    
    return await this.medicalFacadeService.publish(medicalLicense);
  }

  @Get('/:medicalLicenseUuid')
  async getMedicalLicense(@Param('medicalLicenseUuid') medicalLicenseUuid: string): Promise<MedicalLicense> {

    return await this.medicalFacadeService.findByUuid(medicalLicenseUuid);
  }

  @Get('/owner/:ownerUuid')
  async getMedicalLicenseByOwner(@Param('ownerUuid') ownerUuid: string): Promise<MedicalLicense> {
    return await this.medicalFacadeService.findByOwner(ownerUuid);
  }
}


