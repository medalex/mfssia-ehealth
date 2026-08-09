import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GovernanceSyncService } from './governance-sync.service';

@ApiTags('governance-sync')
@Controller('governance-sync')
export class GovernanceSyncController {
  constructor(private readonly service: GovernanceSyncService) {}

  @Get('vector')
  @ApiOperation({
    summary: 'The governance vector computed from the current DKG state',
    description:
      'The 16 values in the canonical order the on-chain verifier expects. Read-only — nothing is pushed. Use it to check that the chain and the DKG agree.',
  })
  async vector() {
    return this.service.currentVector();
  }

  @Post()
  @ApiOperation({
    summary: 'Recompute the governed state and push it on-chain',
    description:
      'Pushes the governance vector, the approved validity windows and the record-root sets. Runs automatically at boot and after every policy publish; this endpoint is the manual re-drive.',
  })
  @ApiResponse({ status: 201, description: '{ vector, hash, approvedValidFor, patientRecordRoots, labRecordRoots }' })
  @ApiResponse({ status: 503, description: 'On-chain publication failed — DKG and chain are diverged' })
  async sync() {
    return this.service.syncAll();
  }
}
