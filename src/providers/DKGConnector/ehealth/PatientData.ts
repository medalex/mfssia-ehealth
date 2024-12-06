import { ApiProperty } from "@nestjs/swagger";

export class PatientData {
    @ApiProperty()
    classifier: string;

    @ApiProperty()
    timestamp: string;
    
    @ApiProperty()
    givenName: string;
    
    @ApiProperty()
    familyName: string;
    
    @ApiProperty()
    phone: string;
    
    @ApiProperty()
    birthDate: string;
    
    @ApiProperty()
    gender: string;
    
    @ApiProperty()
    uuid: string;
    
    @ApiProperty()
    digitalSignature: string;    
}