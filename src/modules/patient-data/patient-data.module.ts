import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { PatientDataDkgService } from './patient-data-dkg.service';
import { PatientDataController } from './patient-data.controller';
import { PatientDataMockService } from './patient-data-mock.service';
import { PatientDataFacadeService } from './patient-data-facade.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [PatientDataController],
  providers: [PatientDataDkgService, PatientDataMockService, PatientDataFacadeService],  
})
export class PatientDataModule {}
