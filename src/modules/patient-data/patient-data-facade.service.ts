import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientData } from 'src/modules/patient-data/patient-data.entity';
import { PatientDataDkgService } from './patient-data-dkg.service';
import { PatientDataMockService } from './patient-data-mock.service';


@Injectable()
export class PatientDataFacadeService {
    constructor(
        private readonly dkgPatientDataService: PatientDataDkgService,
        private readonly mockedPatientDataService: PatientDataMockService,
        private readonly configService: ConfigService) {}

    async findByUUID(uuid: string): Promise<PatientData> {
        if (this.configService.get<boolean>("isDkgMocked")) {
            return await this.mockedPatientDataService.findByUUID(uuid);
        }

        return await this.dkgPatientDataService.findByUUID(uuid);
    }    

    async publish(patientData: PatientData) {
        await this.dkgPatientDataService.publish(patientData);
    }    
}


