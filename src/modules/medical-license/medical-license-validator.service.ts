import { Injectable } from "@nestjs/common";
import { MedicalLicense } from "./medical-license.entity";

@Injectable()
export class MedicalLicenseValidator {
    isValid(medicalLicense: MedicalLicense): boolean {
        if (medicalLicense == null) {
            return false;
        }

        let today = new Date();

        if (new Date(medicalLicense.validTill) < today) {
            return false;
        }

        return true;
    }    
}