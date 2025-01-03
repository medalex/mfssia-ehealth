import { Controller, Get, Param } from "@nestjs/common";
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

    //=====================================Eheatlh use case=======================================================

    @Get('patientDataHash/:patientDataUuid')
    async getPatientData(@Param('patientDataUuid') patientDataUuid: string): Promise<string> {
      return await this.consensusService.getPatientDataHash(patientDataUuid);
    }

    @Get('permissionConsensus/:patientUuid')
    async checkPatientPermissionConsensus(@Param('patientUuid') patientUuid: string): Promise<boolean> {
      return await this.consensusService.checkPatientPermissionConsensus(patientUuid);
    }

    @Get('medicalLicenseConsenus/owner1/:ownerId1/owner2/:ownerId2')
    async checkMedicalLicense(
        @Param('ownerId1') ownerId1: string,
        @Param('ownerId2') ownerId2: string): Promise<boolean> {
      return await this.consensusService.checkMedicalLicenseConsensus(ownerId1, ownerId2);
    }
}