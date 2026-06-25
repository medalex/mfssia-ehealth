import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsNotEmpty } from 'class-validator';

// Generic JSON-LD publish payload. mfssia builds an rx:<type> asset whose
// fields become queryable triples (createAsset), unlike raw Turtle on /rdf.
export class PublishJsonLdDto {
  @ApiProperty({ example: 'urn:hospital:allergy:123' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Allergy', description: 'rdf type (becomes rx:<type>)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: { patientId: '...', substance: 'Penicillin' }, required: false })
  @IsObject()
  @IsOptional()
  literals?: Record<string, string>;

  @ApiProperty({ example: { recordedAt: '2026-06-25T19:35:00.000Z' }, required: false })
  @IsObject()
  @IsOptional()
  dateTimes?: Record<string, string>;
}
