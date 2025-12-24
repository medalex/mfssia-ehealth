import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status: 'ok' | 'error';
  @ApiProperty({ example: 12345 })
  uptime: number;
  @ApiProperty({ example: '2025-01-10T12:34:56.000Z' })
  timestamp: string;
  @ApiProperty({ example: '1.0.0', required: false })
  version?: string;
}

@Injectable()
export class HealthService {
  getBasicHealth(): HealthResponseDto {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
}
