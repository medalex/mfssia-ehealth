import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InfrastructureService } from './infrastructure.service';
import { HealthResponseDto, HealthService } from './healthcheck/health.service';
import { NodeInfoResponseDto } from './node.-info.dto';

@ApiTags('Infrastructure')
@Controller('/api/infrastructure')
export class InfrastructureController {
  constructor(
    private readonly infrastructureService: InfrastructureService,
    private readonly healthService: HealthService,
  ) {}

  @Get('healthcheck')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is up',
    type: HealthResponseDto,
  })
  healthCheck(): HealthResponseDto {
    return this.healthService.getBasicHealth();
  }

  @Get('node-info')
  @ApiOperation({ summary: 'Get node info' })
  @ApiOkResponse({
    description: 'Node info successfully retrieved',
    type: NodeInfoResponseDto,
  })
  async nodeInfo(): Promise<NodeInfoResponseDto> {
    return await this.infrastructureService.getNodeInfo();
  }
}
