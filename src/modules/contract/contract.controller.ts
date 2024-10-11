import { Body, Controller, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { type } from 'os';
import { Contract } from 'src/providers/DKGConnector/Contract';
import { DKGContractService } from './contract.service';

@ApiTags('Contract')
@Controller('/api/contract/product')
export class ContractController {
  constructor(private readonly dkgContractService: DKGContractService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() productContract: Contract): Promise<any> {
    Logger.log({contract: productContract})
    return await this.dkgContractService.publishProductContract(productContract);
  }
}


