import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChallengeEvidenceService } from './challenge-evidence.service';
import { SubmitEvidenceBatchDto } from './dto/submit-evidence.dto';
import { SubmitEvidenceBatchResponseDto } from './dto/challenge-evidence-response.dto';

@ApiTags('challenge-evidence')
@Controller('challenge-evidence')
export class ChallengeEvidenceController {
  constructor(private readonly service: ChallengeEvidenceService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit evidence for a specific challenge in an instance',
  })
  @ApiBody({ type: SubmitEvidenceBatchDto })
  @ApiResponse({ status: 201, type: SubmitEvidenceBatchResponseDto })
  async submit(@Body() dto: SubmitEvidenceBatchDto) {
    return this.service.submitBatch(dto);
  }
}
