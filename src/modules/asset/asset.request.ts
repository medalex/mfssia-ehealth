import { ApiProperty } from "@nestjs/swagger";

export class AssetRequest {
    @ApiProperty()
    schema: string;

    @ApiProperty()
    type: string;

    @ApiProperty()
    content: any;
}