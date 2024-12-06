import { Injectable, Logger } from '@nestjs/common';
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { MedicalLicense } from 'src/providers/DKGConnector/ehealth/MedicalLIcense';
import { System } from 'src/providers/DKGConnector/System';

@Injectable()
export class SystemService {
    constructor(private readonly dkgConnector: DKGConnectorService) {}

    async findByUuid(uuid: string):Promise<System> {
        try {
          
          var query = "PREFIX mfssia:<http://schema.org/> "
                   + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
                   + "SELECT ?s ?p ?o WHERE {"
                   + "?s rdf:type mfssia:System . "
                   + "?s mfssia:uuid '" + uuid + "' . "
                   + "?s ?p ?o . "
                   + "}";
                    
          console.log("Startng query: " + query);

          const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");
          
          console.log(JSON.stringify(result));
    
          return this.mapSystem(result.data);       
        }
        catch (error) {
          throw new Error(error);
        }
    }

    async publish(system: System) {
        try {
            let existingSystem = await this.findByUuid(system.uuid);
    
            console.log("Existing system: " + JSON.stringify(existingSystem));
    
            if (existingSystem.uuid) {
                return null;            
            } else {
                Logger.log({originalSystem: system});
    
                let asset = this.mapToAsset(system);

                const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
                
                Logger.log({ system: assetCreatedOnDKG });
        
                return assetCreatedOnDKG;                
            }
        } catch (error) {
            Logger.error(error);           
        } 
      }

    private mapSystem(sparqlResult: any): System {
        let system = new System();
    
        console.log(sparqlResult);
        sparqlResult.forEach( (element:any) => {
          element.o = element.o.toString().replace(/\"/g, "");
    
          if (element.p == "http://schema.org/uuid") {
            system.uuid = element.o;
          }
    
          if (element.p == "http://schema.org/timestamp") {
              system.timestamp = element.o;
          }
    
          if (element.p == "http://schema.org/network") {
              system.network = element.o;
          }
    
          if (element.p == "http://schema.org/contract_id") {
              system.contracts.push(element.o);
          }
          });
        
        return system;
    }

    private mapToAsset(system: System): Record<string, string> | any {
        let asset = JSON.stringify(system);
  
        Logger.log(asset);
        
        let newAsset = {};
        
        newAsset['@context'] = 'https://schema.org';
        newAsset['@type'] = 'System';
        newAsset['uuid'] = system.uuid;
        newAsset['timestamp'] = system.timestamp;
        newAsset['network'] = system.network;
        newAsset['contracts'] = JSON.stringify([system.contracts])
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
      }
    
}


