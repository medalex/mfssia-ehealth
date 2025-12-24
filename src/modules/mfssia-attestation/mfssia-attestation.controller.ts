import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttestationService } from './mfssia-attestation.service';
import { MfssiaAttestationResponseDto } from './dto/mfssia-attestation-response.dto';

@ApiTags('attestations')
@Controller('attestations')
export class AttestationController {
  constructor(private readonly service: AttestationService) {}

  @Get('did/:did')
  @ApiOperation({ summary: 'Get all valid attestations for a DID' })
  @ApiResponse({ status: 200, type: [MfssiaAttestationResponseDto] })
  async findValidByDid(@Param('did') did: string) {
    return this.service.findValidByDid(did);
  }
}
