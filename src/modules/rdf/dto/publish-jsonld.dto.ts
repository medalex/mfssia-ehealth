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

  @ApiProperty({ example: { snomedCode: '372687004', hasMetric: 'eGFR' }, required: false })
  @IsObject()
  @IsOptional()
  literals?: Record<string, string>;

  @ApiProperty({ example: { hasTimestamp: '2026-06-25T19:35:00.000Z' }, required: false })
  @IsObject()
  @IsOptional()
  dateTimes?: Record<string, string>;

  // Object properties — values are IRIs (e.g. "rx:Penicillin", "urn:patient:..").
  @ApiProperty({ example: { hasPatient: 'urn:patient:..', hasSubstance: 'rx:Penicillin' }, required: false })
  @IsObject()
  @IsOptional()
  iris?: Record<string, string>;

  // xsd:decimal typed literals (e.g. lab values).
  @ApiProperty({ example: { hasValue: '45' }, required: false })
  @IsObject()
  @IsOptional()
  decimals?: Record<string, string>;
}
