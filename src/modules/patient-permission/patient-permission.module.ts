import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { PatientPermissionService } from './patient-permission.service';
import { PatientPermissionController } from './patient-permission.controller';

@Module({
  imports: [DKGConnectorModule],
  controllers: [PatientPermissionController],
  providers: [PatientPermissionService],
})
export class PatientPermissionModule {}
