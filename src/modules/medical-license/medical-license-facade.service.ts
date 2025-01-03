import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MedicalLicense } from 'src/modules/medical-license/medical-license.entity';
import { MedicalLicenseDkgService } from './medical-license-dkg.service';
import { MedicalLicenseMockService } from './medical-license-mock.service';

@Injectable()
export class MedicalLicenseFacadeService {
    constructor(
        private readonly dkgMedicalLicenseService: MedicalLicenseDkgService,
        private readonly mockedMedicalLicenseService: MedicalLicenseMockService,
        private readonly configService: ConfigService   
    ) {}

    async findByUuid(uuid: string): Promise<MedicalLicense> {
        return await this.dkgMedicalLicenseService.findByUuid(uuid);
    }

    async findByOwner(owner: string): Promise<MedicalLicense> {
        if (this.configService.get<boolean>("isDkgMocked")) {
            return await this.mockedMedicalLicenseService.findByOwner(owner);
        }

        return await this.dkgMedicalLicenseService.findByOwner(owner);
    }

    async publish(medicalLicense: MedicalLicense) {
        await this.dkgMedicalLicenseService.publish(medicalLicense);
    }   
}


