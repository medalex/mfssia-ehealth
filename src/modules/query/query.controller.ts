import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueryService } from './query.service';

@ApiBearerAuth()
@ApiTags('Query')
@Controller('/api/query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Get('readAsset/:ual')
  async getAsset(@Param('ual') ual: string): Promise<any> {
    return await this.queryService.queryAsset(ual);
  }
}
