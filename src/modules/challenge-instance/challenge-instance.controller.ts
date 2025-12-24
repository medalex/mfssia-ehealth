import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChallengeInstanceService } from './challenge-instance.service';
import { CreateChallengeInstanceDto } from './dto/create-challenge-instance.dto';
import { ChallengeInstanceResponseDto } from './dto/challenge-instance-response.dto';

@ApiTags('challenge-instances')
@Controller('challenge-instances')
export class ChallengeInstanceController {
  constructor(private readonly service: ChallengeInstanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new challenge instance for a DID' })
  @ApiBody({ type: CreateChallengeInstanceDto })
  @ApiResponse({ status: 201, type: ChallengeInstanceResponseDto })
  async create(@Body() dto: CreateChallengeInstanceDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get challenge instance details' })
  @ApiResponse({ status: 200, type: ChallengeInstanceResponseDto })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
