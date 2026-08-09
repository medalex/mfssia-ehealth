import { Module } from '@nestjs/common';
import { PatientRecordService } from './patient-record.service';
import { PatientRecordController } from './patient-record.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { EvmPublisherModule } from '@/modules/evm-publisher/evm-publisher.module';

@Module({
  imports: [DkgModule, EvmPublisherModule],
  providers: [PatientRecordService],
  controllers: [PatientRecordController],
  exports: [PatientRecordService],
})
export class PatientRecordModule {}
