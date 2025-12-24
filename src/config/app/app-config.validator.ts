import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
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

  @IsString()
  @IsNotEmpty()
  DKG_HOSTNAME: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  DKG_PORT?: number;

  @IsBoolean()
  @IsOptional()
  IS_DKG_MOCKED?: boolean;

  @IsString()
  @IsNotEmpty()
  PUBLIC_KEY: string;

  @IsString()
  @IsNotEmpty()
  PRIVATE_KEY: string;
}
