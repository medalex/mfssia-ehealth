import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class AppConfigValidator {
  @IsString()
  @IsNotEmpty()
  NODE_ENV: string;

  @IsString()
  @IsOptional()
  APP_NAME?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  APP_PORT?: number;

  @IsString()
  @IsOptional()
  API_PREFIX?: string;

  @IsISO8601()
  @IsOptional()
  EVIDENCE_REFERENCE_TIME?: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  DKG_V10_URL?: string;

  @IsString()
  @IsNotEmpty()
  DKG_V10_TOKEN: string;

  @IsString()
  @IsOptional()
  DKG_CONTEXT_GRAPH?: string;

  @IsIn(['draft', 'publish'])
  @IsOptional()
  DKG_WRITE_MODE?: string;

  @IsBoolean()
  @IsOptional()
  IS_DKG_MOCKED?: boolean;
}
