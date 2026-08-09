import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PatientRecordService } from './patient-record.service';

@ApiTags('patient-record')
@Controller('patient-record')
export class PatientRecordController {
  constructor(private readonly service: PatientRecordService) {}

  @Get('roots')
  @ApiOperation({
    summary: 'All patientRecordRoots currently committed in the DKG',
    description: 'The CLASS B membership set pushed to the on-chain verifier. Always includes the empty-tree root (patients with no allergies).',
  })
  listRoots() {
    return this.service.listRoots();
  }

  @Get(':patientId/proof')
  @ApiOperation({
    summary:
      'Patient allergy Merkle proof (patientRecordRoot + leaves + membership) built from DKG allergies',
  })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getProof(@Param('patientId') patientId: string) {
    return this.service.getProof(patientId);
  }
}
