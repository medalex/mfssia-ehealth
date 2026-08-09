import { Module } from '@nestjs/common';
import { GovernanceSyncService } from './governance-sync.service';
import { GovernanceSyncController } from './governance-sync.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { PhysicianRegistryModule } from '@/modules/physician-registry/physician-registry.module';
import { ContraindicationModule } from '@/modules/contraindication/contraindication.module';
import { PatientRecordModule } from '@/modules/patient-record/patient-record.module';
import { LabRecordModule } from '@/modules/lab-record/lab-record.module';
import { EvmPublisherModule } from '@/modules/evm-publisher/evm-publisher.module';

// Importing the four state-owning modules also fixes initialisation order: Nest builds them
// (and their Merkle trees) before this module's onModuleInit pushes the first commitment.
@Module({
  imports: [DkgModule, EvmPublisherModule, PhysicianRegistryModule, ContraindicationModule, PatientRecordModule, LabRecordModule],
  providers: [GovernanceSyncService],
  controllers: [GovernanceSyncController],
  exports: [GovernanceSyncService],
})
export class GovernanceSyncModule {}
