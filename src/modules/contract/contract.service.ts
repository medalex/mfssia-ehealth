import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { IAssetResponse } from 'src/interfaces/IAssetResponse';
import { Contract } from 'src/providers/DKGConnector/Contract';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class DKGContractService {
  constructor(
    private readonly dkgConnector: DKGConnectorService) {}

  async publishProductContract(contract: Contract): Promise<IAssetResponse> {
    try {
      let existingContract = await this.dkgConnector.findContractByUuid(contract.uuid);
      
      console.log("Existing contract: " + JSON.stringify(existingContract));

      

      if (existingContract.uuid) {
        return null;
      } else {
        Logger.log({originalContract: contract});
        let asset = this.mapToAsset(contract);
        const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
        Logger.log({ contract: assetCreatedOnDKG });

        return assetCreatedOnDKG;
        
      }
    } catch (error) {
      Logger.error(error);
      Logger.log(`Error loading file contract json asset : ${error}`);
    }

  }
  private mapToAsset(contract: Contract): Record<string, string> | any {
    let asset = JSON.stringify(contract);
    Logger.log(asset);
    let newAsset = {};
    newAsset['@context'] = 'https://schema.org';
    newAsset['@type'] = 'Contract';
    newAsset['producer_network'] = contract.producerNetwork;
    newAsset['consumer_network'] = contract.consumerNetwork;
    newAsset['delivery_interval'] = contract.deliveryInterval;
    newAsset['product_name'] = contract.productName;    
    newAsset['contractNo'] = contract.contractNo;    
    newAsset['price'] = contract.price;
    newAsset['quantity'] = contract.quantity;
    newAsset['timestamp'] = contract.timestamp;
    newAsset['uuid'] = contract.uuid;

    Logger.debug('newAsset = ' + newAsset);
    
    return newAsset;
    }
}
