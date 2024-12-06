import { Injectable, Logger } from '@nestjs/common';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';
import { Gateway } from 'src/providers/DKGConnector/Gateway';

@Injectable()
export class DKGGatewayService {
  constructor(private readonly dkgConnector: DKGConnectorService) {}

  async findByUuid(uuid: string):Promise<Gateway> {
    try {
      
      var query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Gateway . "
               + "?s mfssia:uuid '" + uuid + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let gateway:Gateway = this.mapGateway(result.data);
        
      return gateway;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async findGatewayByProducerAndConsumerNetworks(producerNetwork: string, consumerNetwork: string):Promise<Gateway> {
    try {
      
      const query = "PREFIX mfssia:<http://schema.org/> "
               + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
               + "SELECT ?s ?p ?o WHERE {"
               + "?s rdf:type mfssia:Gateway . "
               + "?s mfssia:producerNetwork '" + producerNetwork + "' . "
               + "?s mfssia:consumerNetwork '" + consumerNetwork + "' . "
               + "?s ?p ?o . "
               + "}";
                
      console.log("Startng query: " + query);
      const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");
      
      console.log(result);

      let gateway:Gateway = this.mapGateway(result.data);
        
      return gateway;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  async publish(gateway: Gateway) {
    try {
        let existingGateway = await this.findByUuid(gateway.uuid);

        console.log("Existing gateway: " + JSON.stringify(existingGateway));

        if (existingGateway.uuid) {
            return null;
        
        } else {
            Logger.log({originalGateway: gateway});

            let asset = this.mapToAsset(gateway);
            const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
            
            Logger.log({ medicalLicense: assetCreatedOnDKG });
    
            return assetCreatedOnDKG;                
        }
    } catch (error) {
        Logger.error(error);
        Logger.log(`Error loading file medical license json asset : ${error}`);
    } 
  }


  private mapGateway(sparqlResult:any): Gateway {
    if (!Array.isArray(sparqlResult) || !sparqlResult.length) {
      return null;
    }

    console.log(sparqlResult);
    let gateway = new Gateway();

    sparqlResult.forEach( (element:any) => {
      element.o = element.o.toString().replace(/\"/g, "");

      if (element.p == "http://schema.org/uuid") {
          gateway.uuid = element.o;
      }

      if (element.p == "http://schema.org/timestamp") {
          gateway.timestamp = element.o;
      }

      if (element.p == "http://schema.org/consumerNetwork") {
          gateway.consumerNetwork = element.o;
      }

      if (element.p == "http://schema.org/producerNetwork") {
          gateway.providerNetwork = element.o;
      }
    });

    return gateway;
  }

  private mapToAsset(gateway: Gateway): Record<string, string> | any {
    let asset = JSON.stringify(gateway);

    Logger.log(asset);
    
    let newAsset = {};
    newAsset['@context'] = 'https://schema.org';
    newAsset['@type'] = 'Gateway';
    newAsset['uuid'] = gateway.uuid;
    newAsset['timestamp'] = gateway.timestamp;
    newAsset['providerNetwork'] = gateway.providerNetwork;
    newAsset['consumerNetwork'] = gateway.consumerNetwork;
    
    Logger.debug('newAsset = ' + newAsset);
    
    return newAsset;
}

  
}
