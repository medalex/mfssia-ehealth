// dto/publish-system.response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SystemResponseDto } from './system.response.dto';

export class PublishSystemResponseDto {
  @ApiProperty({ type: SystemResponseDto })
  system: SystemResponseDto;

  @ApiProperty({
    description: 'DKG Universal Asset Locator',
    example: 'did:dkg:otp:20430/...',
  })
  ual: string;
}
