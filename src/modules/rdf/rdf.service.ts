import { DkgService } from "@/providers/dkg/dkg.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { PublishJsonLdDto } from "./dto/publish-jsonld.dto";

const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

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

  // Publishes an rx:<type> asset as JSON-LD so its fields are queryable triples.
  // Raw Turtle (ingest) is stored but NOT parsed into the graph by the DKG node.
  async publishJsonLd(dto: PublishJsonLdDto): Promise<string> {
    if (!dto?.id || !dto?.type) {
      throw new BadRequestException('id and type are required');
    }
    const asset: Record<string, unknown> = {
      '@context': { rx: RX, xsd: XSD },
      '@id': dto.id,
      '@type': `rx:${dto.type}`,
    };
    for (const [k, v] of Object.entries(dto.literals ?? {})) {
      asset[`rx:${k}`] = String(v);
    }
    for (const [k, v] of Object.entries(dto.dateTimes ?? {})) {
      asset[`rx:${k}`] = { '@value': String(v), '@type': 'xsd:dateTime' };
    }
    // Object properties → IRI references (rx:Penicillin, urn:patient:..)
    for (const [k, v] of Object.entries(dto.iris ?? {})) {
      asset[`rx:${k}`] = { '@id': String(v) };
    }
    for (const [k, v] of Object.entries(dto.decimals ?? {})) {
      asset[`rx:${k}`] = { '@value': String(v), '@type': 'xsd:decimal' };
    }
    const res = await this.dkgService.createAsset(asset as any);
    return res.UAL;
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
