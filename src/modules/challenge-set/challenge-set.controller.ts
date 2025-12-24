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
import { ChallengeSetService } from './challenge-set.service';
import { CreateChallengeSetDto } from './dto/create-challenge-set.dto';
import { UpdateChallengeSetDto } from './dto/update-challenge-set.dto';
import { ChallengeSetResponseDto } from './dto/challenge-set-response.dto';

@ApiTags('challenge-sets')
@Controller('challenge-sets')
export class ChallengeSetController {
  constructor(private readonly service: ChallengeSetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Challenge Set (governance)' })
  @ApiBody({ type: CreateChallengeSetDto })
  @ApiResponse({ status: 201, type: ChallengeSetResponseDto })
  async create(@Body() dto: CreateChallengeSetDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all published Challenge Sets (marketplace)' })
  @ApiResponse({ status: 200, type: [ChallengeSetResponseDto] })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Challenge Set by ID' })
  @ApiParam({ name: 'code', example: 'mfssia:Example-A' })
  @ApiResponse({ status: 200, type: ChallengeSetResponseDto })
  async findOne(@Param('code') code: string) {
    return this.service.findOne(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Challenge Set (versioning recommended)' })
  @ApiParam({ name: 'id', example: 'mfssia:Example-A' })
  @ApiBody({ type: UpdateChallengeSetDto })
  @ApiResponse({ status: 200, type: ChallengeSetResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateChallengeSetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Challenge Set (only if unused)' })
  @ApiParam({ name: 'id', example: 'mfssia:Example-A' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
