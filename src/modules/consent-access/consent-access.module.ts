import { Module } from '@nestjs/common';
import { ConsentAccessSeedService } from './consent-access.seed.service';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [ConsentAccessSeedService],
  exports: [ConsentAccessSeedService],
})
export class ConsentAccessModule {}
