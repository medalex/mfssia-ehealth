import { Injectable, Logger } from "@nestjs/common";
import { DKGConnectorService } from "src/providers/DKGConnector/dkgConnector.service";
import { generatePatientDataHash, generateSha256Hash } from "src/shared/utils/hashGenerator";
import { PatientDataService } from "../patient-data/patient-data.service";
import { PatientPermissionService } from "../patient-permission/patient-permission.service";
import { MedicalLicenseService } from "../medical-license/medical-license.service";
import { MedicalLicenseValidator } from "../medical-license/medical-license-validator.service";

@Injectable()
export class ConsensusService {
  constructor(
    private readonly dkgConnector: DKGConnectorService,
    private readonly patientDataService: PatientDataService,
    private readonly patientPermissionService: PatientPermissionService,
    private readonly medicalLicenseService: MedicalLicenseService,
    private readonly medicalLicenseValidator: MedicalLicenseValidator ) {}
  
  async getContractHash(contractUuid: string): Promise<any> {
    let contract = await this.dkgConnector.dkgInstance.findContractByUuid(contractUuid);

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
    let contract = await this.dkgConnector.dkgInstance.findContractByUuid(contractUuid); 
    let gateway = await this.dkgConnector.dkgInstance.findGatewayByProducerAndConsumerNetworks(contract.producerNetwork, contract.consumerNetwork);
   
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

  async getPatientDataHash(patientDataUuid: string): Promise<any> {
    let patientData = await this.patientDataService.findByUUID(patientDataUuid);    

    
    Logger.log(JSON.stringify(patientData));
    
    Logger.log("GivenName: " + patientData.givenName);
    Logger.log("familyName: " + patientData.familyName);
    Logger.log("birthDate: " + patientData.birthDate);
    Logger.log("digitalSignature: " + patientData.digitalSignature);
    Logger.log("gender: " + patientData.gender);
    Logger.log("phone: " + patientData.phone);
    
    if (
      patientData.givenName 
      && patientData.familyName 
      && patientData.birthDate 
      && patientData.digitalSignature
      && patientData.gender
      && patientData.phone
    ) {      
        const hash = generatePatientDataHash(
          patientData.givenName,
          patientData.familyName,
          patientData.birthDate,
          patientData.digitalSignature,
          patientData.gender,
          patientData.phone
        );
      
        Logger.log("PatientData: \n " + hash);

        return hash;
    }

    Logger.log("patientData has an empty field. Returning an empty string instead of hash.");

    return "";
  }

  async checkPatientPermissionConsensus(patientUuid: string): Promise<boolean> {   
    let patientPermission = await this.patientPermissionService.findByPatientUuid(patientUuid);   
   
    return patientPermission != null;
  }

  async checkMedicalLicenseConsensus(ownerId1: string, ownerId2: string): Promise<boolean> {
    let medicalLicense1 = await this.medicalLicenseService.findByOwner(ownerId1);
    let isMedicalLicense1Valid = this.medicalLicenseValidator.isValid(medicalLicense1);
    
    let medicalLicense2 = await this.medicalLicenseService.findByOwner(ownerId2);
    let isMedicalLicense2Valid = this.medicalLicenseValidator.isValid(medicalLicense2);    

    return isMedicalLicense1Valid && isMedicalLicense2Valid;
  }
}