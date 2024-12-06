import { ApiProperty } from "@nestjs/swagger";

export class System {
    @ApiProperty()
    uuid: string;

    @ApiProperty()
    timestamp: string;

    @ApiProperty()
    network: string;

    @ApiProperty()
    contracts: Array<number> = Array();
}