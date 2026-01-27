import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { RdfService } from './rdf.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

@Controller('rdf')
export class RdfController {
  constructor(private readonly rdfService: RdfService) {}

@ApiConsumes('text/turtle')
@ApiBody({
  schema: {
    type: 'string',
    example: '@prefix ex: <http://example/> . ex:a ex:b ex:c .',
  },
})
  @Post()
  @HttpCode(200)
  async ingest(
    @Body() rdf: string,
    @Headers('content-type') contentType: string,
  ) {
    await this.rdfService.ingest(rdf, contentType);

    return {
      status: 'ok',
      bytes: rdf.length,
      contentType,
    };
  }
}
