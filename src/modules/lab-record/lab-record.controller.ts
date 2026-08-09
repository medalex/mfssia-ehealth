import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LabRecordService } from './lab-record.service';

@ApiTags('lab-record')
@Controller('lab-record')
export class LabRecordController {
  constructor(private readonly service: LabRecordService) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All labRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no lab results).',
  })
  listRoots() {
    return this.service.listRoots();
  }

  @Get(':patientId')
  @ApiOperation({
    summary: 'Patient lab record from DKG: Merkle root + per-measurement membership proofs',
  })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getProof(@Param('patientId') patientId: string) {
    return this.service.getProof(patientId);
  }
}
