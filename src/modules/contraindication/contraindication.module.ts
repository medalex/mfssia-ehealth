import { Module } from '@nestjs/common';
import { ContraindicationService } from './contraindication.service';
import { ContraindicationController } from './contraindication.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [ContraindicationService],
  controllers: [ContraindicationController],
  exports: [ContraindicationService],
})
export class ContraindicationModule {}
