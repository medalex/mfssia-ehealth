import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PatientRecordService } from './patient-record.service';

@ApiTags('patient-record')
@Controller('patient-record')
export class PatientRecordController {
  constructor(private readonly service: PatientRecordService) {}

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
