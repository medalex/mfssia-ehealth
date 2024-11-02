import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { MedicalLicenseController } from './medical-license.controller';
import { MedicalLicenseService } from './medical-license.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [MedicalLicenseController],
  providers: [MedicalLicenseService],
})
export class MedicalLicenseModule {}
