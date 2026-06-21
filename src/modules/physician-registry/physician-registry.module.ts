import { Module } from '@nestjs/common';
import { PhysicianRegistryService } from './physician-registry.service';
import { PhysicianRegistryController } from './physician-registry.controller';

@Module({
  providers: [PhysicianRegistryService],
  controllers: [PhysicianRegistryController],
  exports: [PhysicianRegistryService],
})
export class PhysicianRegistryModule {}
