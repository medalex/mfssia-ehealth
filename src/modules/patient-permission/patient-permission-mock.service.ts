import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PatientPermission } from 'src/modules/patient-permission/patient-permission.entity';

@Injectable()
export class PatientPermissionMockService {
    private readonly mockedPatientPermission1: PatientPermission;
    private readonly mockedPatientPermission2: PatientPermission;
    constructor() {
        const mockedDataPath1 = path.join(__dirname, '../../resources/DKGPublish/ehealth/patient_permission1.json');        
        this.mockedPatientPermission1 = JSON.parse(fs.readFileSync(mockedDataPath1, 'utf8'));  

        const mockedDataPath2 = path.join(__dirname, '../../resources/DKGPublish/ehealth/patient_permission2.json');        
        this.mockedPatientPermission2 = JSON.parse(fs.readFileSync(mockedDataPath2, 'utf8'));  

            console.log(`Patient permission 1 is ${JSON.stringify(this.mockedPatientPermission1)}`);       
            console.log(`Patient permission 2 is ${JSON.stringify(this.mockedPatientPermission2)}`);   
    }

    async findByPatientUuid(patientUuid: string): Promise<PatientPermission> {
        if (patientUuid == "1234") {
            return Promise.resolve(this.mockedPatientPermission1);
        }

        return Promise.resolve(this.mockedPatientPermission2);
    }    
}


