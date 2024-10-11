import { Module } from '@nestjs/common';
import { DKGContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [ContractController],
  providers: [DKGContractService],
})
export class ContractModule {}
