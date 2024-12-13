import { Module } from "@nestjs/common";
import { DKGConnectorModule } from "src/providers/DKGConnector/dkgConnector.module";
import { MedicalLicenseValidator } from "../medical-license/medical-license-validator.service";
import { MedicalLicenseService } from "../medical-license/medical-license.service";
import { PatientDataService } from "../patient-data/patient-data.service";
import { PatientPermissionService } from "../patient-permission/patient-permission.service";
import { ConsensusController } from "./consensus.controller";
import { ConsensusService } from "./consensus.service";
import { SecurityLicenseService } from "../security-license/security-license.service";

@Module({
    imports: [DKGConnectorModule],
    controllers: [ConsensusController],
    providers: [
      ConsensusService, 
      PatientDataService, 
      PatientPermissionService, 
      SecurityLicenseService,
      MedicalLicenseService, 
      MedicalLicenseValidator]
  })
  export class ConsensusModule {}