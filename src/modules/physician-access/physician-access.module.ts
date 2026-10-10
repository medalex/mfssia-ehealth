import { Module } from '@nestjs/common';
import { PhysicianAccessService } from './physician-access.service';
import { PhysicianAccessController } from './physician-access.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';
import { PhysicianRegistryModule } from '../physician-registry/physician-registry.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [DkgModule, PhysicianRegistryModule, AuditLogModule],
  providers: [PhysicianAccessService],
  controllers: [PhysicianAccessController],
  exports: [PhysicianAccessService],
})
export class PhysicianAccessModule {}
