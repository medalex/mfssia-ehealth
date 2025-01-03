import { Module } from "@nestjs/common";
import { DKGConnectorModule } from "src/providers/DKGConnector/dkgConnector.module";
import { ContractService } from "../contract/contract.service";
import { GatewayService } from "../gateway/gateway.service";
import { MedicalLicenseFacadeService } from "../medical-license/medical-license-facade.service";
import { MedicalLicenseValidator } from "../medical-license/medical-license-validator.service";
import { PatientDataFacadeService } from "../patient-data/patient-data-facade.service";
import { PatientPermissionFacadeService } from "../patient-permission/patient-permission-facade.service";
import { SecurityLicenseService } from "../security-license/security-license.service";
import { ConsensusController } from "./consensus.controller";
import { ConsensusService } from "./consensus.service";
import { PatientDataDkgService } from "../patient-data/patient-data-dkg.service";
import { PatientDataMockService } from "../patient-data/patient-data-mock.service";
import { MedicalLicenseDkgService } from "../medical-license/medical-license-dkg.service";
import { MedicalLicenseMockService } from "../medical-license/medical-license-mock.service";
import { PatientPermissionDkgService } from "../patient-permission/patient-permission-dkg.service";
import { PatientPermissionMockService } from "../patient-permission/patient-permission-mock.service";

@Module({
    imports: [DKGConnectorModule],
    controllers: [ConsensusController],
    providers: [      
      PatientDataFacadeService,       
      PatientDataDkgService,
      PatientDataMockService,
      
      MedicalLicenseFacadeService, 
      MedicalLicenseDkgService, 
      MedicalLicenseMockService, 
      
      PatientPermissionFacadeService,
      PatientPermissionDkgService,
      PatientPermissionMockService,

      MedicalLicenseValidator,

      ConsensusService,

      //Non-ehealth use case
      SecurityLicenseService,      
      ContractService,
      GatewayService      
    ]
  })
  export class ConsensusModule {}