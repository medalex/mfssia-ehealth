import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PatientDataService } from './patient-data.service';
import { PatientData } from 'src/modules/patient-data/patient-data.entity';



@ApiTags('PatientData')
@Controller('/api/patient-data')
export class PatientDataController {
  constructor(private readonly patientDataService: PatientDataService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() patientData: PatientData): Promise<any> {
    Logger.log({patientData: patientData});

    return await this.patientDataService.publish(patientData);
  }

  @Get('/:patientDataUuid')
  async getPatientData(@Param('patientDataUuid') contpatientDataUuidractUuid: string): Promise<PatientData> {
    return await this.patientDataService.findByUUID(contpatientDataUuidractUuid);
  }
}


