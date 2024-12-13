import { Logger } from "@nestjs/common";
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { SecurityLicense } from "src/modules/security-license/security-license.entity";

export class SecurityLicenseService {
    constructor(private readonly dkgConnector: DKGConnectorService) {}
    
    async findByUuid(uuid: string):Promise<SecurityLicense> {
        try {
          
          var query = "PREFIX mfssia:<http://schema.org/> "
                   + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
                   + "SELECT ?s ?p ?o WHERE {"
                   + "?s rdf:type mfssia:SecurityLicense . "
                   + "?s mfssia:uuid '" + uuid + "' . "
                   + "?s ?p ?o . "
                   + "}";
                    
          console.log("Startng query: " + query);
          const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");
          
          console.log(result);
    
          let securityLicense:SecurityLicense = this.mapSecurityLicense(result.data);
            
          return securityLicense;
        }
        catch (error) {
          throw new Error(error);
        }
    }

    async publish(securityLicense: SecurityLicense) {
        try {
            let existingSecurityLicense = await this.findByUuid(securityLicense.uuid);

            console.log("Existing securityLicense: " + JSON.stringify(existingSecurityLicense));

            if (existingSecurityLicense.uuid) {
                return null;
            
            } else {
                Logger.log({originalSecurityLicense: securityLicense});

                let asset = this.mapToAsset(securityLicense);

                const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
                
                Logger.log({ securityLicense: assetCreatedOnDKG });
        
                return assetCreatedOnDKG;                
            }
        } catch (error) {
            Logger.error(error);
            Logger.log(`Error loading file security license json asset : ${error}`);
        } 
    }


    private mapSecurityLicense(sparqlResult:any): SecurityLicense {
        let securityLicense = new SecurityLicense();
      
        sparqlResult.forEach( (element:any) => {
          element.o = element.o.toString().replace(/\"/g, "");
          if (element.p == "http://schema.org/uuid") {
              securityLicense.uuid = element.o;
          }
      
          if (element.p == "http://schema.org/timestamp") {
              securityLicense.timestamp = element.o;
          }
      
          if (element.p == "http://schema.org/issuer") {
              securityLicense.issuer = element.o;
          }
      
          if (element.p == "http://schema.org/licenseNo") {
              securityLicense.licenseNo = element.o;
          }
      
          if (element.p == "http://schema.org/systemUUID") {
              securityLicense.systemUUID = element.o;
          }
        
          if (element.p == "http://schema.org/validTill") {
              securityLicense.validTill = element.o;
          }
      
          if (element.p == "http://schema.org/owner") {
            securityLicense.owner = element.o;
        }
        });
       
        Logger.log(JSON.stringify(securityLicense));
      
        return securityLicense;
      }

      private mapToAsset(securityLicense: SecurityLicense): Record<string, string> | any {
        let asset = JSON.stringify(securityLicense);
        Logger.log(asset);
        let newAsset = {};
        newAsset['@context'] = 'https://schema.org';
        newAsset['@type'] = 'MedicalLicense';
        newAsset['licenseNo'] = securityLicense.licenseNo;
        newAsset['timestamp'] = securityLicense.timestamp;
        newAsset['systemUUID'] = securityLicense.systemUUID;
        newAsset['issuer'] = securityLicense.issuer;
        newAsset['validTill'] = securityLicense.validTill;    
        newAsset['uuid'] = securityLicense.uuid;
        newAsset['owner'] = securityLicense.owner;    
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
    }
}