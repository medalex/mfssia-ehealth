import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { PatientDataService } from './patient-data.service';
import { PatientDataController } from './patient-data.controller';

@Module({
  imports: [DKGConnectorModule],
  controllers: [PatientDataController],
  providers: [PatientDataService],
})
export class PatientDataModule {}
