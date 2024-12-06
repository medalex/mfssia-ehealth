import { Module } from '@nestjs/common';
import { DKGConnectorModule } from '../../providers/DKGConnector/dkgConnector.module';
import { SecurityLicenseController } from './security-license.controller';
import { SecurityLicenseService } from './security-license.service';

@Module({
  imports: [DKGConnectorModule],
  controllers: [SecurityLicenseController],
  providers: [SecurityLicenseService],
})
export class SecurityLicenseModule {}
