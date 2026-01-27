import { DkgService } from "@/providers/dkg/dkg.service";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class RdfService {
  constructor(
    private readonly dkgService: DkgService,
  ) {}

  async ingest(rdf: string, contentType: string) {
    if (!rdf || rdf.length < 10) {
      throw new BadRequestException('Empty RDF');
    }

    return this.dkgService.publishRdf(rdf, contentType);
  }
}
