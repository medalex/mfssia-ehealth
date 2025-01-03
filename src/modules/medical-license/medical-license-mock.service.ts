import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { MedicalLicense } from 'src/modules/medical-license/medical-license.entity';

@Injectable()
export class MedicalLicenseMockService {
    private readonly mockedMedicalLicense1: MedicalLicense;
    private readonly mockedMedicalLicense2: MedicalLicense;

    constructor() {           
        const medicalLicense1Path = path.join(__dirname, '../../resources/DKGPublish/ehealth/medicalLicense1.json');        
        this.mockedMedicalLicense1 = JSON.parse(fs.readFileSync(medicalLicense1Path, 'utf8'));  

        const medicalLicense2Path = path.join(__dirname, '../../resources/DKGPublish/ehealth/medicalLicense2.json');        
        this.mockedMedicalLicense2 = JSON.parse(fs.readFileSync(medicalLicense2Path, 'utf8'));  

         console.log(`Medical license 1 is ${JSON.stringify(this.mockedMedicalLicense1)}`);       
         console.log(`Medical license 2 is ${JSON.stringify(this.mockedMedicalLicense2)}`);       
    }

    async findByOwner(owner: string): Promise<MedicalLicense> {
        if (owner == "12333") {
            return Promise.resolve(this.mockedMedicalLicense1);
        }  
        
        if (owner == "12388" ) {
            return Promise.resolve(this.mockedMedicalLicense2);
        }

        return Object.assign(new MedicalLicense(), {
            licenseNo: "MockedLicenseNo",
            systemUUID: "11111",
            issuer: "MockedIssuer",
            validTill: "2000-01-01",
            uuid: "MockedUUID",
            timestamp: new Date().toISOString(),
            owner: "000000",
        });
    }   
}


