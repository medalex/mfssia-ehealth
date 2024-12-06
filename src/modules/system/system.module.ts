import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
