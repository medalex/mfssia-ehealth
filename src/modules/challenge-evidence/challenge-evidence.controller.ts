import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChallengeEvidenceService } from './challenge-evidence.service';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { ChallengeEvidenceResponseDto } from './dto/challenge-evidence-response.dto';

@ApiTags('challenge-evidence')
@Controller('challenge-evidence')
export class ChallengeEvidenceController {
  constructor(private readonly service: ChallengeEvidenceService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit evidence for a specific challenge in an instance',
  })
  @ApiBody({ type: SubmitEvidenceDto })
  @ApiResponse({ status: 201, type: ChallengeEvidenceResponseDto })
  async submit(@Body() dto: SubmitEvidenceDto) {
    return this.service.submit(dto);
  }
}
