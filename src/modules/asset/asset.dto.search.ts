import { IsOptional, IsString } from "class-validator";

export class SearchAssetDto {
    @IsOptional()
    @IsString()
    property?: string;

    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    @IsString()
    schema?: string;

    @IsOptional()
    @IsString()
    type?: string;
  }