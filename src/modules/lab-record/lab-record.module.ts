import { Module } from '@nestjs/common';
import { LabRecordService } from './lab-record.service';
import { LabRecordController } from './lab-record.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [LabRecordService],
  controllers: [LabRecordController],
  exports: [LabRecordService],
})
export class LabRecordModule {}
