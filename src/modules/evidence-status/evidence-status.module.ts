import { Module } from '@nestjs/common';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { LabRecordModule } from '@/modules/lab-record/lab-record.module';
import { PatientRecordModule } from '@/modules/patient-record/patient-record.module';
import { PhysicianAccessModule } from '@/modules/physician-access/physician-access.module';
import { EvidenceStatusController } from './evidence-status.controller';
import { EvidenceStatusService } from './evidence-status.service';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { PilotDemoSeedService } from './pilot-demo-seed.service';

@Module({
  imports: [AuditLogModule, DkgModule, LabRecordModule, PatientRecordModule, PhysicianAccessModule],
  controllers: [EvidenceStatusController],
  providers: [EvidenceStatusService, PilotDemoSeedService],
})
export class EvidenceStatusModule {}