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
      let existingContract = await this.dkgConnector.dkgInstance.findContractByUuid(contract.uuid);
      
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

  public async findContractByUuid(contractUuid: string):Promise<Contract> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Contract . "
               + "?s mfssia:uuid '" + contractUuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);

      const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");

      Logger.log('queryResult: ' + JSON.stringify(result));

      let contract:Contract = this.mapContract(result.data);

      Logger.log(JSON.stringify(contract));
        
      return contract;
    }
    catch (error) {
      throw new Error(error);
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

  private mapContract(sparqlResult: any): Contract {
    let contract = new Contract();
    
    sparqlResult.forEach( (element:any) => {
      element.o = element.o.toString().replace(/\"/g, "");
      if (element.p == "http://schema.org/uuid") {
          contract.uuid = element.o;
      }

      if (element.p == "http://schema.org/timestamp") {
          contract.timestamp = element.o;
      }
      
      if (element.p == "http://schema.org/contractNo") {
          contract.contractNo = element.o;
      }

      if (element.p == "http://schema.org/consumer_network") {
          contract.consumerNetwork = element.o;
      }

      if (element.p == "http://schema.org/producer_network") {
          contract.producerNetwork = element.o;
      }

      if (element.p == "http://schema.org/price") {
          contract.price = element.o;
      }

      if (element.p == "http://schema.org/quantity") {
          contract.quantity = element.o;
      }

      if (element.p == "http://schema.org/delivery_interval") {
          contract.deliveryInterval = element.o;
      }

      if (element.p == "http://schema.org/product_name") {
          contract.productName = element.o;
      }
    });

    return contract;
  }
}
