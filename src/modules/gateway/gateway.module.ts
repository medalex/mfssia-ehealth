import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';

@Module({
  imports: [DKGConnectorModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
