import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { PatientPermissionDkgService } from './patient-permission-dkg.service';
import { PatientPermissionController } from './patient-permission.controller';
import { PatientPermissionMockService } from './patient-permission-mock.service';
import { PatientPermissionFacadeService } from './patient-permission-facade.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [PatientPermissionController],
  providers: [PatientPermissionDkgService, PatientPermissionMockService, PatientPermissionFacadeService],
})
export class PatientPermissionModule {}
