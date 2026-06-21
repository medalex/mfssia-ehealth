import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PhysicianRegistryService } from './physician-registry.service';

@ApiTags('physician-registry')
@Controller('physician-registry')
export class PhysicianRegistryController {
  constructor(private readonly service: PhysicianRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'Список лицензированных врачей в реестре МФССИА' })
  @ApiResponse({ status: 200, description: 'Список врачей с credential hash для ZKP' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить credential hash врача по его ID' })
  @ApiParam({ name: 'id', description: 'UUID врача (совпадает с ID в hospital-api)' })
  @ApiResponse({ status: 200, description: 'Данные врача включая credentialHash для ZKP' })
  @ApiResponse({ status: 404, description: 'Врач не найден в реестре МФССИА' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
