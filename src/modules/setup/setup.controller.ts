import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DKGInitialSetupService } from './setup.service';

@ApiBearerAuth()
@ApiTags('Setup')
@Controller('/api/setup')
export class SetupController {
  constructor(
    private readonly dkgInitialSetupService: DKGInitialSetupService,
  ) {}

  @Get('healthcheck')
  healthCheck(): string {
    return JSON.stringify({
      message: 'up',
    });
  }

  @Get('node-info')
  async nodeInfo(): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.getNodeInfo();
  }

  @Get('publishSystem/:index')
  async publishSystem1(@Param('index') index: number): Promise<IAssetResponse> {
    console.log(index);
    return await this.dkgInitialSetupService.publishSystem(index);
  }

  @Get('publishSecurityLicense/:index')
  async publishSecurityLicense1(@Param('index') index: number): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.publishSecurityLicense(index);
  }

  @Get('publishContract')
  async publishContract(): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.publishContract();
  }

  @Get('publishContract2')
  async publishContract2(): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.publishContract2();
  }

  @Get('publishGateway/:index')
  async publishGateways(@Param('index') index: number): Promise<IAssetResponse> {
    return await this.dkgInitialSetupService.publishGateway(index);
  }

  @Get('readAsset/:ual')
  async getAsset(@Param('ual') ual: string): Promise<any> {
    return await this.dkgInitialSetupService.queryAsset(ual);
  }
}
