import { Module } from '@nestjs/common';
import { DkgService } from './dkg.service';

@Module({
  providers: [DkgService],
  exports: [DkgService],
})
export class DkgModule {}
