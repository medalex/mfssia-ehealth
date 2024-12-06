import { ApiProperty } from "@nestjs/swagger";

export class Gateway {
    @ApiProperty()
    uuid: string;

    @ApiProperty()
    providerNetwork: string;

    @ApiProperty()
    consumerNetwork: string;

    @ApiProperty()
    timestamp: string;
}