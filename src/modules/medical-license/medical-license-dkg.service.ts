import { Injectable, Logger } from '@nestjs/common';
import { DkgService } from "src/providers/DKGConnector/dkgConnector.service";
import { MedicalLicense } from 'src/modules/medical-license/medical-license.entity';

@Injectable()
export class MedicalLicenseDkgService {
    constructor(private readonly dkgConnector: DkgService) {}

    async findByUuid(uuid: string): Promise<MedicalLicense> {
        try {
            var query = "PREFIX mfssia:<http://schema.org/> "
            + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
            + "SELECT ?s ?p ?o WHERE {"
            + "?s rdf:type mfssia:MedicalLicense . "
            + "?s mfssia:uuid '" + uuid + "' . "
            + "?s ?p ?o . "
            + "}";  
            
            console.log("[MedicalLicenseService] Startng query: " + query);
            const result = await this.dkgConnector.dkg.graph.query(query, "SELECT");

            console.log(result);

            return this.mapMedicalLicense(result.data);
        } catch(error) {
            throw new Error(error);
        }
    }

    async findByOwner(owner: string): Promise<MedicalLicense> {
        try {
            var query = "PREFIX mfssia:<http://schema.org/> "
            + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
            + "SELECT ?s ?p ?o WHERE {"
            + "?s rdf:type mfssia:MedicalLicense . "
            + "?s mfssia:owner '" + owner + "' . "
            + "?s ?p ?o . "
            + "}";
            
            console.log("Startng query: " + query);

            const result = await this.dkgConnector.dkg.graph.query( query, "SELECT");

            console.log(result);

            return this.mapMedicalLicense(result.data);                    
        } catch (error) {
            throw new Error(error);  
        }  
    }

    async publish(medicalLicense: MedicalLicense) {
        try {
            let existingMedicalLicense = await this.findByUuid(medicalLicense.uuid);

            console.log("Existing medicalLicense: " + JSON.stringify(existingMedicalLicense));

            if (existingMedicalLicense.uuid) {
                return null;
            
            } else {
                Logger.log({originalMedicalLicense: medicalLicense});

                let asset = this.mapToAsset(medicalLicense);
                const assetCreatedOnDKG = await this.dkgConnector.createAsset(asset);
                
                Logger.log({ medicalLicense: assetCreatedOnDKG });
        
                return assetCreatedOnDKG;                
            }
        } catch (error) {
            Logger.error(error);
            Logger.log(`Error loading file medical license json asset : ${error}`);
        } 
    }

    private mapMedicalLicense(sparqlResult:any): MedicalLicense {
        let medicalLicense = new MedicalLicense();

        sparqlResult.forEach( (element:any) => {
          element.o = element.o.toString().replace(/\"/g, "");
          if (element.p == "http://schema.org/uuid") {
              medicalLicense.uuid = element.o;
          }
      
          if (element.p == "http://schema.org/timestamp") {
              medicalLicense.timestamp = element.o;
          }
      
          if (element.p == "http://schema.org/issuer") {
              medicalLicense.issuer = element.o;
          }
      
          if (element.p == "http://schema.org/licenseNo") {
              medicalLicense.licenseNo = element.o;
          }
      
          if (element.p == "http://schema.org/systemUUID") {
              medicalLicense.systemUUID = element.o;
          }
        
          if (element.p == "http://schema.org/validTill") {
              medicalLicense.validTill = element.o;
          }
      
          if (element.p == "http://schema.org/owner") {
            medicalLicense.owner = element.o;
        }
        });
       
        Logger.log(JSON.stringify(medicalLicense));
      
        return medicalLicense;   
    }

    private mapToAsset(medicalLicense: MedicalLicense): Record<string, string> | any {        
        Logger.log(JSON.stringify(medicalLicense));
        
        let newAsset = {};
        newAsset['@context'] = 'https://schema.org';
        newAsset['@type'] = 'MedicalLicense';
        newAsset['licenseNo'] = medicalLicense.licenseNo;
        newAsset['timestamp'] = medicalLicense.timestamp;
        newAsset['systemUUID'] = medicalLicense.systemUUID;
        newAsset['issuer'] = medicalLicense.issuer;
        newAsset['validTill'] = medicalLicense.validTill;    
        newAsset['uuid'] = medicalLicense.uuid;
        newAsset['owner'] = medicalLicense.owner;    
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
    }
}


