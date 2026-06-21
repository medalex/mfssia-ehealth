import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PhysicianRegistryService } from './physician-registry.service';

@ApiTags('physician-registry')
@Controller('physician-registry')
export class PhysicianRegistryController {
  constructor(private readonly service: PhysicianRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List all licensed physicians in the MFSSIA registry' })
  findAll() {
    return this.service.findAll();
  }

  @Get('merkle-root')
  @ApiOperation({ summary: 'Physician registry Merkle root (published to DKG)' })
  @ApiResponse({ status: 200, schema: { example: { root: '123456789...', dkgUal: 'urn:dkg:...' } } })
  getMerkleRoot() {
    return { root: this.service.getMerkleRoot(), dkgUal: this.service.getDkgUal() };
  }

  @Get(':id/merkle-proof')
  @ApiOperation({ summary: 'Physician registry membership proof (for ZKP prover)' })
  @ApiParam({ name: 'id', description: 'Physician UUID' })
  @ApiResponse({ status: 200, description: 'credentialHash + siblings + pathBits for the circuit' })
  @ApiResponse({ status: 404, description: 'Physician not found in registry' })
  getMerkleProof(@Param('id') id: string) {
    return this.service.getMerkleProof(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get physician data by ID' })
  @ApiParam({ name: 'id', description: 'Physician UUID' })
  @ApiResponse({ status: 404, description: 'Physician not found in registry' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
