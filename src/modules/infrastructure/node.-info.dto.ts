import { ApiProperty } from "@nestjs/swagger";

export class NodeInfoResponseDto {
    @ApiProperty({ example: "0.0.1" })
    version: string;
}