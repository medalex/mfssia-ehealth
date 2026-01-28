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
}
