import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DKGGatewayService } from './gateway.service';

@ApiBearerAuth()
@ApiTags('Gateway')
@Controller('/api/gateway')
export class GatewayController {
  constructor(private readonly dkgGatewayService: DKGGatewayService) {}
}
