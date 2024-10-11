import { Injectable, Logger } from "@nestjs/common";
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { generateSha256Hash } from "src/shared/utils/hashGenerator";

@Injectable()
export class ConsensusService {
  constructor(private readonly dkgConnector: DKGConnectorService) {}
  
  async getContractHash(contractUuid: string): Promise<any> {
    let contract = await this.dkgConnector.findContractByUuid(contractUuid);

    Logger.log(JSON.stringify(contract));

    if (contract.price && contract.deliveryInterval && contract.quantity && contract.productName) {
      const contractHash = generateSha256Hash(
          contract.price, 
          contract.deliveryInterval, 
          contract.quantity, 
          contract.productName.toLowerCase());
      
          Logger.log("Contract: \n " + contractHash);

      return contractHash;
    }

    Logger.log("Contract has an empty field. Returning an empty string instead of hash.")
    return "";
  }

  async checkGatewayConsensus(contractUuid: string): Promise<boolean> {
    let contract = await this.dkgConnector.findContractByUuid(contractUuid); 
    let gateway = await this.dkgConnector.findGatewayByProducerAndConsumerNetworks(contract.producerNetwork, contract.consumerNetwork);
   
    return gateway != null;
  }

  async checkSecurityLicenseConsensus(ownerId1: string, ownerId2: string): Promise<boolean> {
    let securityLicense1 = await this.dkgConnector.findSecurityLicenseByOwner(ownerId1);
    let securityLicense2 = await this.dkgConnector.findSecurityLicenseByOwner(ownerId2);  
    
    if (securityLicense1 == null || securityLicense2 == null) {
        return false;
    }

    const today = new Date();

    if (new Date(securityLicense1.validTill) > today && new Date(securityLicense2.validTill) > today) {
        return true;
    }

    return false;

}

  

}