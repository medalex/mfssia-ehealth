import { Module } from '@nestjs/common';
import { PhysicianRegistryService } from './physician-registry.service';
import { PhysicianRegistryController } from './physician-registry.controller';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  providers: [PhysicianRegistryService],
  controllers: [PhysicianRegistryController],
  exports: [PhysicianRegistryService],
})
export class PhysicianRegistryModule {}
