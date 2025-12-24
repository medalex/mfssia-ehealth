import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateChallengeDefinitionDto } from './dto/create-challenge-definition.dto';
import { UpdateChallengeDefinitionDto } from './dto/update-challenge-definition.dto';
import { ChallengeDefinitionService } from './challenge-definitions.service';
import { ChallengeDefinitionResponseDto } from './dto/challenge-definition-response.dto';
import { Uuid } from '@/common/types/common.type';

@ApiTags('challenge-definitions')
@Controller('challenge-definitions')
export class ChallengeDefinitionController {
  constructor(private readonly service: ChallengeDefinitionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new immutable Challenge Definition (governance)',
  })
  @ApiBody({ type: CreateChallengeDefinitionDto })
  @ApiResponse({ status: 201, type: ChallengeDefinitionResponseDto })
  async create(@Body() dto: CreateChallengeDefinitionDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all Challenge Definitions' })
  @ApiResponse({ status: 200, type: [ChallengeDefinitionResponseDto] })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single Challenge Definition by ID' })
  @ApiParam({ name: 'code', example: 'mfssia:C-A-1' })
  @ApiResponse({ status: 200, type: ChallengeDefinitionResponseDto })
  async findOne(@Param('code') code: string) {
    return this.service.findOne(code);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a Challenge Definition (only allowed pre-publish)',
  })
  @ApiParam({ name: 'id', example: 'mfssia:C-A-1' })
  @ApiBody({ type: UpdateChallengeDefinitionDto })
  @ApiResponse({ status: 200, type: ChallengeDefinitionResponseDto })
  async update(
    @Param('id') id: Uuid,
    @Body() dto: UpdateChallengeDefinitionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Challenge Definition (only if not used)' })
  @ApiParam({ name: 'id', example: 'qeqew-rrtrte22323p-5555' })
  async remove(@Param('id') id: Uuid) {
    return this.service.remove(id);
  }
}
