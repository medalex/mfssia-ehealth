import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { System } from 'src/providers/DKGConnector/System';
import { SystemService } from './system.service';

@ApiTags('System')
@Controller('/api/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() system: System): Promise<any> {
    Logger.log({system: system});

    return await this.systemService.publish(system);
  }

  @Get('/:systemUuid')
  async getMedicalLicense(@Param('systemUuid') systemUuid: string): Promise<System> {
    return await this.systemService.findByUuid(systemUuid);
  }
}


