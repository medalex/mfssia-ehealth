import { Injectable } from '@nestjs/common';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class QueryService {
  constructor(private readonly dkgConnector: DKGConnectorService) {}

 
  async getNodeInfo(): Promise<any> {
    return await this.dkgConnector.getDkgNode();
  }

  async queryAsset(UAL: string): Promise<any> {
    return await this.dkgConnector.readAnAssetFromDKG(UAL);
  }

  async querySystem(systemUuid: string): Promise<any> {
    return await this.dkgConnector.findSystemByUuid(systemUuid);
  }

  async queryContract(contractUuid: string): Promise<any> {
    return await this.dkgConnector.findContractByUuid(contractUuid);
  }

  async queryGateway(uuid: string): Promise<any> {
    return await this.dkgConnector.findGatewayByUuid(uuid);
  }

  async querySecurityLicense(uuid: string): Promise<any> {
    return await this.dkgConnector.findSecurityLicenseByUuid(uuid);
  }
}
