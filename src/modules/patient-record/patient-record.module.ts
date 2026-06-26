import { Module } from '@nestjs/common';
import { PatientRecordService } from './patient-record.service';
import { PatientRecordController } from './patient-record.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [PatientRecordService],
  controllers: [PatientRecordController],
  exports: [PatientRecordService],
})
export class PatientRecordModule {}
