import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PatientData } from 'src/modules/patient-data/patient-data.entity';


@Injectable()
export class PatientDataMockService {
    private readonly mockedPatientData: PatientData;

    constructor() {
        const mockedDataPath = path.join(__dirname, '../../resources/DKGPublish/ehealth/patient_data.json');        
        this.mockedPatientData = JSON.parse(fs.readFileSync(mockedDataPath, 'utf8'));       
    }

    async findByUUID(uuid: string): Promise<PatientData> {
        if (uuid == "1234") {
            return Promise.resolve(this.mockedPatientData);
        }        

        return Promise.resolve(Object.assign(new PatientData(), {              
            classifier: "MOCKED_CLASSIFIER",                            
            givenName: "MOCKED_GIVEN_NAME",
            familyName: "MOCKED_FAMILT_NAME",
            phone: "MOCKED_PHONE",
            birthDate: "2000-01-01",                
            gender: "MOCKED_GENDER",
            uuid: "0000",                
            digitalSignature: "MOCKED_SIGNATURE"
        }))
    }    
}


