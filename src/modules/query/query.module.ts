import { Module } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
