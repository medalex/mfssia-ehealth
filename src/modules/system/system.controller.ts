import {
  Body,
  Controller,
  Get,  
  Param,
  Post,
} from '@nestjs/common';
import {  
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { SystemService } from './system.service';
import { PublishSystemRequestDto } from './dto/system.publish-request.dto';
import { SystemResponseDto } from './dto/system.response.dto';
import { SystemMapper } from './system.mapper';
import { PublishSystemResponseDto } from './dto/system.publish-response.dto';

@ApiTags('System')
@Controller('api/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('publish')
  @ApiOkResponse({ type: PublishSystemResponseDto })
  async publish(@Body() dto: PublishSystemRequestDto): Promise<PublishSystemResponseDto> {
    return this.systemService.publish(dto);
  }

  @Get(':systemUuid')
  @ApiOperation({ summary: 'Get system by UUID' })
  @ApiParam({
    name: 'systemUuid',
    description: 'System UUID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  })
  @ApiOkResponse({ type: SystemResponseDto })
  async getSystem(@Param('systemUuid') systemUuid: string): Promise<SystemResponseDto> {
    const system = await this.systemService.findByUuid(systemUuid);

    return SystemMapper.toResponse(system);
  }
}
