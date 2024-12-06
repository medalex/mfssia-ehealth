import { ApiProperty } from "@nestjs/swagger";

export class PatientPermission {
    @ApiProperty()
    uuid: string;

    @ApiProperty()
    producerOrgNo: string;

    @ApiProperty()
    consumerOrgNo: string;

    @ApiProperty()
    timestamp: string; 

    @ApiProperty()
    patientUUID: string;       
}