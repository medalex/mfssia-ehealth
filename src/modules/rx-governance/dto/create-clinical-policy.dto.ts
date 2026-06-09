import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ComparisonOperator } from '@/common/enums/comparison-operator.enum';

export class CreateClinicalPolicyDto {
  @ApiProperty({ example: 'pol:metformin-egfr' })
  @IsString()
  @Matches(/^pol:[a-z0-9-]+$/)
  code: string;

  @ApiProperty({ example: 'Metformin requires eGFR ≥ 30' })
  @IsString()
  name: string;

  // Identifies the medication; becomes urn:rx:medication:<medicationCode> on DKG
  @ApiProperty({ example: 'metformin' })
  @IsString()
  medicationCode: string;

  // Pol(m, t, op, θ) — t
  @ApiProperty({ example: 'eGFR', description: 'Clinical attribute name' })
  @IsString()
  clinicalCondition: string;

  // Pol(m, t, op, θ) — op
  @ApiProperty({ enum: ComparisonOperator, example: ComparisonOperator.GTE })
  @IsEnum(ComparisonOperator)
  comparisonOperator: ComparisonOperator;

  // Pol(m, t, op, θ) — θ
  @ApiProperty({ example: 30 })
  @IsNumber()
  threshold: number;

  // Optional conditional threshold expression θ(p)
  @ApiPropertyOptional({ example: 'age >= 11 ? 2000 : 500' })
  @IsString()
  @IsOptional()
  conditionalThreshold?: string;

  // Δmax in seconds for Fresh(r, M, t_req)
  @ApiProperty({ example: 7776000, description: 'Freshness bound in seconds (e.g. 7776000 = 90 days)' })
  @IsInt()
  @IsPositive()
  @Min(3600)
  deltaMax: number;
}
