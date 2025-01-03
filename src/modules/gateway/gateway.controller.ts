import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { Gateway } from 'src/modules/gateway/gateway.entity';

@ApiBearerAuth()
@ApiTags('Gateway')
@Controller('/api/gateway')
export class GatewayController {
  constructor(private readonly dkgGatewayService: GatewayService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() gateway: Gateway): Promise<any> {
    Logger.log({gateway: gateway})

    return await this.dkgGatewayService.publish(gateway);
  }
  
  @Get('/:gatewayUuid')
  async getMedicalLicense(@Param('gatewayUuid') gatewayUuid: string): Promise<Gateway> {
    return await this.dkgGatewayService.findByUuid(gatewayUuid);
  }
}
