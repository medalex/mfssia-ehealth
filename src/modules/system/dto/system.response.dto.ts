import { ApiProperty } from '@nestjs/swagger';

export class SystemResponseDto {
  @ApiProperty()
  uuid: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  network: string;

  @ApiProperty({ type: [Number] })
  contracts: number[];
}
