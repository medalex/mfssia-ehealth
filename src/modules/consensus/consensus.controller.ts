import { Controller, Get, Logger, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConsensusService } from "./consensus.service";

@ApiBearerAuth()
@ApiTags('Consensus')
@Controller('/api/consensus')
export class ConsensusController {
    constructor(
      private readonly consensusService: ConsensusService,
    ) {}

    @Get('contractHash/:contractUuid')
    async getContract(@Param('contractUuid') contractUuid: string): Promise<string> {
      return await this.consensusService.getContractHash(contractUuid);
    }

    @Get('gatewayConsensus/:contractUuid')
    async checkGatewayConsensus(@Param('contractUuid') contractUuid: string): Promise<boolean> {
      return await this.consensusService.checkGatewayConsensus(contractUuid);
    }

    @Get('securityLicenseConsenus/owner1/:ownerId1/owner2/:ownerId2')
    async checkSecurityLicense(
        @Param('ownerId1') ownerId1: string,
        @Param('ownerId2') ownerId2: string): Promise<boolean> {
      return await this.consensusService.checkSecurityLicenseConsensus(ownerId1, ownerId2);
    }
}