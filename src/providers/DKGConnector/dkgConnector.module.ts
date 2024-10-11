import { Module } from '@nestjs/common';
import { DKGConnectorService } from './dkgConnector.service';

@Module({
  providers: [DKGConnectorService],
  exports: [DKGConnectorService],
})
export class DKGConnectorModule {}
