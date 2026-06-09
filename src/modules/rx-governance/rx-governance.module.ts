import { Module } from '@nestjs/common';
import { RxGovernanceService } from './rx-governance.service';
import { RxGovernanceController } from './rx-governance.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [RxGovernanceService],
  controllers: [RxGovernanceController],
  exports: [RxGovernanceService],
})
export class RxGovernanceModule {}
