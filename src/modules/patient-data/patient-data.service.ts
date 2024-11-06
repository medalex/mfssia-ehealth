import { Injectable, Logger } from '@nestjs/common';
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { PatientData } from 'src/providers/DKGConnector/ehealth/PatientData';


@Injectable()
export class PatientDataService {
    constructor(private readonly dkgConnector: DKGConnectorService) {}

    async findByUUID(uuid: string): Promise<any> {
        try {
            var query = "PREFIX mfssia:<http://schema.org/> "
            + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> "
            + "SELECT ?s ?p ?o WHERE {"
            + "?s rdf:type mfssia:PatientData . "
            + "?s mfssia:uuid '" + uuid + "' . "
            + "?s ?p ?o . "
            + "}";  
            
            console.log("[PatientDataService] Startng query: " + query);
            const result = await this.dkgConnector.dkgInstance.graph.query(query, "SELECT");

            console.log(result);

            return this.mapPatientData(result.data);
        } catch(error) {
            throw new Error(error);
        }
    }    

    async publish(patientData: PatientData) {
        try {
            let existingPatientData = await this.findByUUID(patientData.uuid);

            console.log("Existing patientData: " + JSON.stringify(existingPatientData));

            if (existingPatientData.uuid) {
                return null;
            
            } else {
                Logger.log({originalPatientData: patientData});

                let asset = this.mapToAsset(patientData);
                const assetCreatedOnDKG = await this.dkgConnector.createAssetOnDKG(asset);
                
                Logger.log({ patientData: assetCreatedOnDKG });
        
                return assetCreatedOnDKG;                
            }
        } catch (error) {
            Logger.error(error);
            Logger.log(`Error loading file patient data json asset : ${error}`);
    } 
    }

    private mapPatientData(sparqlResult:any): PatientData {
        let patientData = new PatientData();

        sparqlResult.forEach( (element:any) => {
          element.o = element.o.toString().replace(/\"/g, "");
          if (element.p == "http://schema.org/uuid") {
            patientData.uuid = element.o;
          }
      
          if (element.p == "http://schema.org/timestamp") {
            patientData.timestamp = element.o;
          }
      
          if (element.p == "http://schema.org/classifier") {
            patientData.classifier = element.o;
          }
      
          if (element.p == "http://schema.org/given_name") {
            patientData.givenName = element.o;
          }
      
          if (element.p == "http://schema.org/family_name") {
            patientData.familyName = element.o;
          }
        
          if (element.p == "http://schema.org/tel") {
            patientData.phone = element.o;
          }
      
          if (element.p == "http://schema.org/birthDate") {
            patientData.birthDate = element.o;
          }

          if (element.p == "http://schema.org/gender") {
            patientData.gender = element.o;
          }

          if (element.p == "http://schema.org/digitalSignature") {
            patientData.digitalSignature = element.o;
          }
        });
       
        Logger.log(JSON.stringify(patientData));
      
        return patientData;   
    }

    private mapToAsset(patientData: PatientData): Record<string, string> | any {
        let asset = JSON.stringify(patientData);
        Logger.log(asset);
        let newAsset = {};
        newAsset['@context'] = 'https://schema.org';
        newAsset['@type'] = 'PatientData';
        newAsset['classifier'] = patientData.classifier;
        newAsset['timestamp'] = patientData.timestamp;
        newAsset['given_name'] = patientData.givenName;
        newAsset['family_name'] = patientData.familyName;
        newAsset['tel'] = patientData.phone;    
        newAsset['uuid'] = patientData.uuid;
        newAsset['birthDate'] = patientData.birthDate;    
        newAsset['gender'] = patientData.gender;  
        newAsset['digitalSignature'] = patientData.digitalSignature;  
        
        Logger.debug('newAsset = ' + newAsset);
        
        return newAsset;
      }
}


