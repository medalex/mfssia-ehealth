import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { MedicalLicenseController } from './medical-license.controller';
import { MedicalLicenseService } from './medical-license.service';
import { MedicalLicenseValidator } from './medical-license-validator.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [MedicalLicenseController],
  providers: [MedicalLicenseService, MedicalLicenseValidator],
})
export class MedicalLicenseModule {}
