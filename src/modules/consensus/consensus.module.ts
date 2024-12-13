import { Module } from "@nestjs/common";
import { DKGConnectorModule } from "src/providers/DKGConnector/dkgConnector.module";
import { ConsensusController } from "./consensus.controller";
import { ConsensusService } from "./consensus.service";
import { PatientDataService } from "../patient-data/patient-data.service";
import { PatientDataModule } from "../patient-data/patient-data.module";
import { MedicalLicenseModule } from "../medical-license/medical-license.module";
import { PatientPermissionModule } from "../patient-permission/patient-permission.module";
import { MedicalLicenseService } from "../medical-license/medical-license.service";
import { MedicalLicenseValidator } from "../medical-license/medical-license-validator.service";
import { PatientPermissionService } from "../patient-permission/patient-permission.service";

@Module({
    imports: [DKGConnectorModule],
    controllers: [ConsensusController],
    providers: [ConsensusService, PatientDataService, PatientPermissionService, MedicalLicenseService, MedicalLicenseValidator]
  })
  export class ConsensusModule {}