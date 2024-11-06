import { Injectable, Logger } from '@nestjs/common';
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { MedicalLicense } from 'src/providers/DKGConnector/ehealth/MedicalLIcense';
import { PatientPermission } from 'src/providers/DKGConnector/ehealth/PatientPermission';

@Injectable()
export class PatientPermissionService {
    constructor(private readonly dkgConnector: DKGConnectorService) {}

    async findByUUID(uuid: string): Promise<any> {
        try {
            var query = "PREFIX mfssia:<http://schema.org/> "
            + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
            + "SELECT ?s ?p ?o WHERE {"
            + "?s rdf:type mfssia:PatientPermission . "
            + "?s mfssia:uuid '" + uuid + "' . "
            + "?s ?p ?o . "
            + "}";  
            
            console.log("[PatientPermissionService] Startng query: " + query);
            const result = await this.dkgConnector.dkgInstance.graph.query(query, "SELECT");

            console.log(result);

            return this.mapPatientPermission(result.data);
        } catch(error) {
            throw new Error(error);
        }
    }

    async findByOwner(owner: string): Promise<PatientPermission> {
        try {
            var query = "PREFIX mfssia:<http://schema.org/> "
            + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
            + "SELECT ?s ?p ?o WHERE {"
            + "?s rdf:type mfssia:SecurityLicense . "
            + "?s mfssia:owner '" + owner + "' . "
            + "?s ?p ?o . "
            + "}";
            
            console.log("Startng query: " + query);

            const result = await this.dkgConnector.dkgInstance.graph.query( query, "SELECT");

            console.log(result);

            return this.mapPatientPermission(result.data);                    
        } catch (error) {
            throw new Error(error);  
        }  
    }

    async publish(patientPermission: PatientPermission) {
        try {
            let existingPatientPermission = await this.findByUUID(patientPermission.uuid);

            console.log("Existing patientPermission: " + JSON.stringify(existingPatientPermission));

            if (existingPatientPermission.uuid) {
                return null;
            
            } else {
                Logger.log({originalPatientPermission: patientPermission});

                let asset = this.mapToAsset(patientPermission);
                const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
                
                Logger.log({ patientPermission: assetCreatedOnDKG });
        
                return assetCreatedOnDKG;                
            }
        } catch (error) {
            Logger.error(error);
            Logger.log(`Error loading file medical license json asset : ${error}`);
    } 
    }

    private mapPatientPermission(sparqlResult:any): PatientPermission {
        let patientPermission = new PatientPermission();

        sparqlResult.forEach( (element:any) => {
          element.o = element.o.toString().replace(/\"/g, "");
          if (element.p == "http://schema.org/uuid") {
            patientPermission.uuid = element.o;
          }
      
          if (element.p == "http://schema.org/timestamp") {
            patientPermission.timestamp = element.o;
          }
      
          if (element.p == "http://schema.org/producerOrgNo") {
            patientPermission.producerOrgNo = element.o;
          }
      
          if (element.p == "http://schema.org/consumerOrgNo") {
            patientPermission.consumerOrgNo = element.o;
          }
      
          if (element.p == "http://schema.org/patientUUID") {
            patientPermission.patientUUID = element.o;
          }
        });
       
        Logger.log(JSON.stringify(patientPermission));
      
        return patientPermission;   
    }

    private mapToAsset(patientPermission: PatientPermission): Record<string, string> | any {
        let asset = JSON.stringify(patientPermission);

        Logger.log(asset);
        
        let newAsset = {};
        
        newAsset['@context'] = 'https://schema.org';
        newAsset['@type'] = 'PatientPermission';
        newAsset['producerOrgNo'] = patientPermission.producerOrgNo;
        newAsset['timestamp'] = patientPermission.timestamp;
        newAsset['consumerOrgNo'] = patientPermission.consumerOrgNo;
        newAsset['patientUUID'] = patientPermission.patientUUID;        
        newAsset['uuid'] = patientPermission.uuid;        
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
      }
}

