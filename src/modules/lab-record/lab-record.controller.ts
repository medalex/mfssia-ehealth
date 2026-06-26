import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LabRecordService } from './lab-record.service';

@ApiTags('lab-record')
@Controller('lab-record')
export class LabRecordController {
  constructor(private readonly service: LabRecordService) {}

  @Get(':patientId')
  @ApiOperation({ summary: "Patient lab measurements read from the DKG graph (rx:LabResult)" })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  getResults(@Param('patientId') patientId: string) {
    return this.service.getResults(patientId);
  }
}
