import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { InfrastructureService } from './infrastructure.service';

@ApiBearerAuth()
@ApiTags('Infrastructure')
@Controller('/api/setup')
export class InfrastructureController {
  constructor(
    private readonly infrastructureService: InfrastructureService,
  ) {}

  @Get('healthcheck')
  healthCheck(): string {
    return JSON.stringify({
      message: 'up',
    });
  }

  @Get('node-info')
  async nodeInfo(): Promise<IAssetResponse> {
    return await this.infrastructureService.getNodeInfo();
  }
}
