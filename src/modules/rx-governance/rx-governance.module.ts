import { Module } from '@nestjs/common';
import { RxGovernanceService } from './rx-governance.service';
import { RxGovernanceController } from './rx-governance.controller';
import { NumericBridgeService } from './numeric-bridge.service';
import { NumericBridgeController } from './numeric-bridge.controller';
import { TerminologyBridgeService } from './terminology-bridge.service';
import { TerminologyBridgeController } from './terminology-bridge.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { GovernanceSyncModule } from '@/modules/governance-sync/governance-sync.module';

@Module({
  imports: [DkgModule, GovernanceSyncModule],
  providers: [RxGovernanceService, NumericBridgeService, TerminologyBridgeService],
  controllers: [RxGovernanceController, NumericBridgeController, TerminologyBridgeController],
  exports: [RxGovernanceService, NumericBridgeService, TerminologyBridgeService],
})
export class RxGovernanceModule {}
