import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientPermission } from 'src/modules/patient-permission/patient-permission.entity';
import { PatientPermissionDkgService } from './patient-permission-dkg.service';
import { PatientPermissionMockService } from './patient-permission-mock.service';

@Injectable()
export class PatientPermissionFacadeService {
    constructor(
        private readonly dkgPatientPermissionService: PatientPermissionDkgService,
        private readonly mockedPatientPermissionService: PatientPermissionMockService,
        private readonly configService: ConfigService
    ) {}

    async findByUuid(uuid: string): Promise<PatientPermission> {
        return await this.dkgPatientPermissionService.findByUuid(uuid);
    }

    async findByPatientUuid(patientUuid: string): Promise<PatientPermission> {
        if (this.configService.get<boolean>("isDkgMocked")) {
            return await this.mockedPatientPermissionService.findByPatientUuid(patientUuid);
        }

        return this.dkgPatientPermissionService.findByPatientUuid(patientUuid);
    }

    async publish(patientPermission: PatientPermission) {
     await this.dkgPatientPermissionService.publish(patientPermission);
    }
}


