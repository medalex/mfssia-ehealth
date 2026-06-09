import { DkgService } from "@/providers/dkg/dkg.service";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class RdfService {
  constructor(
    private readonly dkgService: DkgService,
  ) {}

  async ingest(rdf: string, contentType: string): Promise<string> {
    if (!rdf || rdf.length < 10) {
      throw new BadRequestException('Empty RDF');
    }

    const dkgResponse = await this.dkgService.publishRdf(rdf, contentType);

    return dkgResponse.UAL;
  }

  async query(sparql: string): Promise<unknown> {
    if (!sparql || sparql.trim().length === 0) {
      throw new BadRequestException('Empty SPARQL query');
    }
    return this.dkgService.findAssets(sparql);
  }

  async readAsset(ual: string): Promise<unknown> {
    if (!ual || ual.trim().length === 0) {
      throw new BadRequestException('UAL is required');
    }
    return this.dkgService.readAsset(ual);
  }
}
