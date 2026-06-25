import { Controller, Post, Get, Body, Headers, Query, HttpCode } from '@nestjs/common';
import { RdfService } from './rdf.service';
import { PublishJsonLdDto } from './dto/publish-jsonld.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('rdf')
@Controller('rdf')
export class RdfController {
  constructor(private readonly rdfService: RdfService) {}

  @ApiConsumes('text/turtle')
  @ApiBody({
    schema: { type: 'string', example: '@prefix ex: <http://example/> . ex:a ex:b ex:c .' },
  })
  @Post()
  @HttpCode(200)
  async ingest(
    @Body() rdf: string,
    @Headers('content-type') contentType: string,
  ) {
    return { UAL: await this.rdfService.ingest(rdf, contentType) };
  }

  @Post('jsonld')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish an rx:<type> asset as queryable JSON-LD' })
  async ingestJsonLd(@Body() dto: PublishJsonLdDto) {
    return { UAL: await this.rdfService.publishJsonLd(dto) };
  }

  @Post('query')
  @HttpCode(200)
  @ApiOperation({ summary: 'Execute a SPARQL SELECT query on the DKG graph' })
  @ApiBody({ schema: { type: 'object', properties: { sparql: { type: 'string' } } } })
  async query(@Body('sparql') sparql: string) {
    return this.rdfService.query(sparql);
  }

  @Get('asset')
  @ApiOperation({ summary: 'Read a DKG Knowledge Asset by UAL' })
  @ApiQuery({ name: 'ual', required: true, description: 'Uniform Asset Locator' })
  async readAsset(@Query('ual') ual: string) {
    return this.rdfService.readAsset(ual);
  }
}
