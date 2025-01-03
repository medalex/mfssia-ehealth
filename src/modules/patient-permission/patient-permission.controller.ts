import { Body, Controller, Get, Header, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PatientPermissionDkgService } from './patient-permission-dkg.service';
import { PatientPermission } from 'src/modules/patient-permission/patient-permission.entity';


@ApiTags('PatientPermission')
@Controller('/api/patient-permission')
export class PatientPermissionController {
  constructor(private readonly patientPermissionService: PatientPermissionDkgService) {}

  @Post('publish')
  @Header('Content-Type', 'application/json')
  async publish(@Body() patientPermission: PatientPermission): Promise<any> {
    Logger.log({permission: patientPermission});

    return await this.patientPermissionService.publish(patientPermission);
  }

  @Get('/:patientPermissionUuid')
  async getPatientData(@Param('patientPermissionUuid') patientPermissionUuid: string): Promise<PatientPermission> {
    return await this.patientPermissionService.findByUuid(patientPermissionUuid);
  }
}


