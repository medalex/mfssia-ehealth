import { Module } from '@nestjs/common';
import { MedicalLicenseDkgService } from './medical-license-dkg.service';
import { MedicalLicenseFacadeService } from './medical-license-facade.service';
import { MedicalLicenseMockService } from './medical-license-mock.service';
import { MedicalLicenseValidator } from './medical-license-validator.service';
import { MedicalLicenseController } from './medical-license.controller';
import { DKGConnectorModule } from 'src/providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [MedicalLicenseController],
  providers: [
    MedicalLicenseDkgService, 
    MedicalLicenseValidator, 
    MedicalLicenseMockService, 
    MedicalLicenseFacadeService],
})
export class MedicalLicenseModule {}
