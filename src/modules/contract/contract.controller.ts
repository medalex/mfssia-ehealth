import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { type } from 'os';
import { Contract } from 'src/modules/contract/contract.entity';
import { ContractService } from './contract.service';

@ApiTags('Contract')
@Controller('/api/contract/product')
export class ContractController {
  constructor(private readonly dkgContractService: ContractService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() productContract: Contract): Promise<any> {
    Logger.log({contract: productContract})
    return await this.dkgContractService.publishProductContract(productContract);
  }

  @Get('queryContract/:uuid')
  async getContract(@Param('uuid') uuid: string): Promise<any> {
    return await this.dkgContractService.findContractByUuid(uuid);
  }
}


