import { Injectable, Logger } from "@nestjs/common";
import { generatePatientDataHash, generateSha256Hash } from "src/shared/utils/hashGenerator";
import { ContractService } from "../contract/contract.service";
import { GatewayService } from "../gateway/gateway.service";
import { MedicalLicenseFacadeService } from "../medical-license/medical-license-facade.service";
import { MedicalLicenseValidator } from "../medical-license/medical-license-validator.service";
import { PatientDataFacadeService } from "../patient-data/patient-data-facade.service";
import { PatientPermissionFacadeService } from "../patient-permission/patient-permission-facade.service";
import { SecurityLicenseService } from "../security-license/security-license.service";

@Injectable()
export class ConsensusService {
  constructor(            
    private readonly medicalLicenseFacadeService: MedicalLicenseFacadeService,
    private readonly patientDataFacadeService: PatientDataFacadeService,
    private readonly patientPermissionFacadeService: PatientPermissionFacadeService,
    private readonly medicalLicenseValidator: MedicalLicenseValidator,

    private readonly securityLicenseService: SecurityLicenseService,    
    private readonly contractService: ContractService,
    private readonly gatewayService: GatewayService,    
  
    
   ) {}
  
  async getContractHash(contractUuid: string): Promise<any> {
    let contract = await this.contractService.findContractByUuid(contractUuid);

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
    let contract = await this.contractService.findContractByUuid(contractUuid); 
    let gateway = await this.gatewayService.findGatewayByProducerAndConsumerNetworks(contract.producerNetwork, contract.consumerNetwork);
   
    return gateway != null;
  }

  async checkSecurityLicenseConsensus(ownerId1: string, ownerId2: string): Promise<boolean> {
    let securityLicense1 = await this.securityLicenseService.findByOwner(ownerId1);
    let securityLicense2 = await this.securityLicenseService.findByOwner(ownerId2);  
    
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
    let patientData = await this.patientDataFacadeService.findByUUID(patientDataUuid);    

    
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
    let patientPermission = await this.patientPermissionFacadeService.findByPatientUuid(patientUuid);   
   
    return patientPermission != null;
  }

  async checkMedicalLicenseConsensus(ownerId1: string, ownerId2: string): Promise<boolean> {
    let medicalLicense1 = await this.medicalLicenseFacadeService.findByOwner(ownerId1);
    let isMedicalLicense1Valid = this.medicalLicenseValidator.isValid(medicalLicense1);
    
    let medicalLicense2 = await this.medicalLicenseFacadeService.findByOwner(ownerId2);
    let isMedicalLicense2Valid = this.medicalLicenseValidator.isValid(medicalLicense2);    

    return isMedicalLicense1Valid && isMedicalLicense2Valid;
  }
}