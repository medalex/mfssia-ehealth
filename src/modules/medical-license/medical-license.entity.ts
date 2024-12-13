import { ApiProperty } from "@nestjs/swagger";

export class MedicalLicense {
    @ApiProperty()
    licenseNo: string;
    
    @ApiProperty()
    systemUUID: string;
    
    @ApiProperty()
    issuer: string;
    
    @ApiProperty()
    validTill: string;
    
    @ApiProperty()    
    uuid: string;
    
    @ApiProperty()
    timestamp: string;
    
    @ApiProperty()
    owner: string;
}