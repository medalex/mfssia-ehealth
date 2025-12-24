import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RegisterIdentityDto } from './dto/register-identity.dto';
import { IdentityService } from './mfssia-identity.service';
import { MfssiaIdentityResponseDto } from './dto/mfssia-identity-response.dto';

@ApiTags('identities')
@Controller('identities')
export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new DID with selected Challenge Set' })
  @ApiBody({ type: RegisterIdentityDto })
  @ApiResponse({ status: 201, type: MfssiaIdentityResponseDto })
  async register(@Body() dto: RegisterIdentityDto) {
    return this.service.register(dto);
  }

  @Get(':did')
  @ApiOperation({ summary: 'Get identity details by DID' })
  @ApiResponse({ status: 200, type: MfssiaIdentityResponseDto })
  async findByDid(@Param('did') did: string) {
    return this.service.findByDid(did);
  }
}
