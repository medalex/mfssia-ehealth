import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
