import { Module } from '@nestjs/common';
import { RxGovernanceService } from './rx-governance.service';
import { RxGovernanceController } from './rx-governance.controller';
import { NumericBridgeService } from './numeric-bridge.service';
import { NumericBridgeController } from './numeric-bridge.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [RxGovernanceService, NumericBridgeService],
  controllers: [RxGovernanceController, NumericBridgeController],
  exports: [RxGovernanceService, NumericBridgeService],
})
export class RxGovernanceModule {}
