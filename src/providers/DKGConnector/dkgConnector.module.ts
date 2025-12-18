import { Module } from '@nestjs/common';
import { DkgService } from './dkgConnector.service';

@Module({
  providers: [DkgService],
  exports: [DkgService],
})
export class DKGConnectorModule {}
