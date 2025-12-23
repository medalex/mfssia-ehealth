import { Module } from '@nestjs/common';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureController } from './infrastructure.controller';
import { DkgModule } from '../../providers/dkg/dkg.module';
import { HealthService } from './healthcheck/health.service';

@Module({
  imports: [DkgModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService, HealthService],
})
export class InfrastructureModule {}
