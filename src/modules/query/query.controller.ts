import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueryService } from './query.service';

@ApiBearerAuth()
@ApiTags('Query')
@Controller('/api/query')
export class QueryController {
  constructor(
    private readonly queryService: QueryService,
  ) {}

  @Get('readAsset/:ual')
  async getAsset(@Param('ual') ual: string): Promise<any> {
    return await this.queryService.queryAsset(ual);
  }

  @Get('querySystem/:uuid')
  async getSystem(@Param('uuid') uuid: string): Promise<any> {
    return await this.queryService.querySystem(uuid);
  }

  @Get('queryContract/:uuid')
  async getContract(@Param('uuid') uuid: string): Promise<any> {
    return await this.queryService.queryContract(uuid);
  }

  @Get('queryGateway/:uuid')
  async getGateway(@Param('uuid') uuid: string): Promise<any> {
    return await this.queryService.queryGateway(uuid);
  }

  @Get('querySecurityLicense/:uuid')
  async getSecurityLicense(@Param('uuid') uuid: string): Promise<any> {
    return await this.queryService.querySecurityLicense(uuid);
  }
}
