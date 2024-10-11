import { Module } from '@nestjs/common';
import { DKGInitialSetupService } from './setup.service';
import { SetupController } from './setup.controller';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [SetupController],
  providers: [DKGInitialSetupService],
})
export class DKGSetupModule {}
