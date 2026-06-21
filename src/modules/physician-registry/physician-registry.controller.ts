import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PhysicianRegistryService } from './physician-registry.service';

@ApiTags('physician-registry')
@Controller('physician-registry')
export class PhysicianRegistryController {
  constructor(private readonly service: PhysicianRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'Список лицензированных врачей в реестре МФССИА' })
  findAll() {
    return this.service.findAll();
  }

  @Get('merkle-root')
  @ApiOperation({ summary: 'Корень Меркле дерева реестра врачей (публикуется в DKG)' })
  @ApiResponse({ status: 200, schema: { example: { root: '123456789...', dkgUal: 'urn:dkg:...' } } })
  getMerkleRoot() {
    return { root: this.service.getMerkleRoot(), dkgUal: this.service.getDkgUal() };
  }

  @Get(':id/merkle-proof')
  @ApiOperation({ summary: 'Доказательство принадлежности врача к реестру (для ZKP прувера)' })
  @ApiParam({ name: 'id', description: 'UUID врача' })
  @ApiResponse({ status: 200, description: 'credentialHash + siblings + pathBits для circuit' })
  @ApiResponse({ status: 404, description: 'Врач не найден в реестре' })
  getMerkleProof(@Param('id') id: string) {
    return this.service.getMerkleProof(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Данные врача по ID' })
  @ApiParam({ name: 'id', description: 'UUID врача' })
  @ApiResponse({ status: 404, description: 'Врач не найден в реестре' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
