import { Module } from '@nestjs/common';
import { LabRecordService } from './lab-record.service';
import { LabRecordController } from './lab-record.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { EvmPublisherModule } from '@/modules/evm-publisher/evm-publisher.module';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { PhysicianAccessModule } from '@/modules/physician-access/physician-access.module';

@Module({
  imports: [DkgModule, EvmPublisherModule, AuditLogModule, PhysicianAccessModule],
  providers: [LabRecordService],
  controllers: [LabRecordController],
  exports: [LabRecordService],
})
export class LabRecordModule {}
