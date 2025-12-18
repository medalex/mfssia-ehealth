import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsUUID } from 'class-validator';

export class PublishSystemRequestDto {
  @ApiProperty({
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    description: 'System UUID',
  })
  @IsUUID()
  uuid: string;

  @ApiProperty({
    example: 'ethereum',
    description: 'Blockchain network name',
  })
  @IsString()
  network: string;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'Contracts identifiers',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  contracts: number[];
}
