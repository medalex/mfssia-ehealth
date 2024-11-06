import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PatientPermissionService } from './patient-permission.service';
import { PatientPermission } from 'src/providers/DKGConnector/ehealth/PatientPermission';


@ApiTags('PatientPermission')
@Controller('/api/patient-permission')
export class PatientPermissionController {
  constructor(private readonly patientPermissionService: PatientPermissionService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() patientPermission: PatientPermission): Promise<any> {
    Logger.log({permission: patientPermission});

    return await this.patientPermissionService.publish(patientPermission);
  }

  @Get('/:patientPermissionUuid')
  async getPatientData(@Param('patientPermissionUuid') patientPermissionUuid: string): Promise<string> {
    return await this.patientPermissionService.findByUUID(patientPermissionUuid);
  }
}


