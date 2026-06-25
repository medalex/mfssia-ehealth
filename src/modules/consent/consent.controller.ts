import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { PublishConsentDto } from './dto/publish-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';

@ApiTags('consents')
@Controller('consents')
export class ConsentController {
  constructor(private readonly service: ConsentService) {}

  @Post('publish')
  @ApiOperation({ summary: 'Anchor a DataSharingConsent as a queryable JSON-LD asset in DKG' })
  publish(@Body() dto: PublishConsentDto) {
    return this.service.publish(dto);
  }

  @Post('revoke')
  @ApiOperation({ summary: 'Anchor a ConsentRevocation tombstone in DKG' })
  revoke(@Body() dto: RevokeConsentDto) {
    return this.service.revoke(dto);
  }
}
