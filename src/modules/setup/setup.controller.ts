import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DKGInitialSetupService } from './setup.service';

@ApiBearerAuth()
@ApiTags('Setup')
@Controller('/api/setup')
export class SetupController {
  constructor(
    private readonly dkgInitialSetupService: DKGInitialSetupService,
  ) {}

  @Get('healthcheck')
  healthCheck(): string {
    return JSON.stringify({
      message: 'up',
    });
  }

  @Get('node-info')
  async nodeInfo(): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.getNodeInfo();
  }
}
