import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DkgQueryResultDto } from './dkg-query-result.dto';
import { NodeInfoResponseDto } from '@/modules/infrastructure/node.-info.dto';
import { BaseDkgAssetDto } from './base-dkg-asset.dto';
import { AppConfig } from '@/config/app/app-config.type';
import { DkgV10Client, DkgV10Error, DkgV10Quad } from './dkg-v10.client';
import { canonizeJsonLd, RdfFormat, rdfToQuads } from './rdf-quads';
import {
  contentHash,
  knowledgeAssetName,
  parseUal,
  toUal,
} from './knowledge-asset-naming';

const RDF_FORMATS: RdfFormat[] = [
  'text/turtle',
  'application/n-triples',
  'application/n-quads',
  'application/trig',
];

// All DKG access of MFSSIA, on an OriginTrail DKG V10 node. Everything lives in one context
// graph (DKG_CONTEXT_GRAPH); knowledge assets are Working Memory drafts (DKG_WRITE_MODE=draft),
// which need no blockchain. Which KA a write goes to is decided in knowledge-asset-naming.ts.
@Injectable()
export class DkgService {
  private readonly logger = new Logger(DkgService.name);
  private readonly client: DkgV10Client;
  private readonly contextGraphId: string;
  private contextGraphReady: Promise<void> | null = null;

  constructor(private config: ConfigService) {
    this.logger.log('🔧 Initializing DKG V10 client...');

    const dkgConfig = this.config.get<AppConfig['dkg']>('app.dkg');

    if (!dkgConfig) {
      this.logger.error('❌ DKG configuration not found in app config');
      throw new Error('DKG configuration missing');
    }
    if (dkgConfig.writeMode !== 'draft') {
      throw new Error(
        `DKG_WRITE_MODE=${dkgConfig.writeMode} is not supported yet: only "draft" (Working Memory, no blockchain) is implemented`,
      );
    }

    this.client = new DkgV10Client({
      baseUrl: dkgConfig.url,
      token: dkgConfig.token,
    });
    this.contextGraphId = dkgConfig.contextGraph;

    this.logger.log(
      `✅ DKG V10 client initialized: ${dkgConfig.url}, context graph "${this.contextGraphId}"`,
    );
  }

  // Creates the context graph on first use. A failure is not cached, so the next call retries
  // (the node may start after the backend).
  private ensureContextGraph(): Promise<void> {
    this.contextGraphReady ??= this.client
      .createContextGraph(
        this.contextGraphId,
        this.contextGraphId,
        'MFSSIA eHealth governance data',
      )
      .then(
        () =>
          this.logger.log(`🗂️ Context graph "${this.contextGraphId}" created`),
        (error) => {
          if (error instanceof DkgV10Error && error.status === 409) return;
          throw error;
        },
      )
      .catch((error) => {
        this.contextGraphReady = null;
        throw error;
      });
    return this.contextGraphReady;
  }

  // Writes the quads as a new KA unless a KA with this name exists. The node itself appends to an
  // existing KA, so existence is checked first.
  private async writeKnowledgeAsset(
    name: string,
    quads: DkgV10Quad[],
  ): Promise<IAssetResponse> {
    await this.ensureContextGraph();
    const UAL = toUal(this.contextGraphId, name);

    const existing = await this.client
      .getKnowledgeAsset(this.contextGraphId, name)
      .catch((error) => {
        if (error instanceof DkgV10Error && error.status === 404) return null;
        throw error;
      });
    if (existing) {
      this.logger.log(
        `♻️ Knowledge asset already exists, write skipped: UAL=${UAL}`,
      );
      return {
        UAL,
        assertionId: String(existing.assertionGraph ?? ''),
        operation: { operationId: name, status: 'SKIPPED' },
      };
    }

    const created = await this.client.createKnowledgeAsset(
      this.contextGraphId,
      name,
      quads,
    );
    return {
      UAL,
      assertionId: String(created.assertionUri ?? ''),
      operation: {
        operationId: name,
        status: String(created.status ?? 'COMPLETED'),
      },
    };
  }

  async getDkgNodeInfo(): Promise<NodeInfoResponseDto> {
    this.logger.verbose('📡 Fetching DKG node info');
    try {
      const info =
        (await this.client.getStatus()) as unknown as NodeInfoResponseDto &
          Record<string, unknown>;
      this.logger.verbose(
        `Node info retrieved: version=${info.version}, network=${info.networkName}`,
      );
      return info;
    } catch (error: any) {
      this.logger.error(`Failed to fetch node info: ${error.message}`);
      throw error;
    }
  }

  async createAsset(asset: BaseDkgAssetDto): Promise<IAssetResponse> {
    this.logger.log('🗄️ Creating general DKG asset');
    this.logger.debug(
      `Asset payload:\n${JSON.stringify(asset, null, 2)}`
    );

    try {
      const canonical = await canonizeJsonLd(asset);
      const quads = rdfToQuads(canonical, 'application/n-quads');
      const name = knowledgeAssetName(asset['@id'], contentHash(canonical));
      const response = await this.writeKnowledgeAsset(name, quads);

      this.logger.log(`✅ General asset created: UAL=${response.UAL}`);

      return response;
    } catch (error: any) {
      this.logger.error(
        `❌ Error creating general asset: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  async readAsset(ual: string): Promise<unknown> {
    this.logger.verbose(`📥 Reading DKG asset: ${ual}`);
    try {
      const { contextGraphId, name } = parseUal(ual);
      const [state, quads] = await Promise.all([
        this.client.getKnowledgeAsset(contextGraphId, name),
        this.client.getKnowledgeAssetQuads(contextGraphId, name),
      ]);

      this.logger.verbose(`✅ Asset retrieved successfully from DKG`);
      return { UAL: ual, ...state, assertion: quads };
    } catch (error: any) {
      this.logger.error(
        `Failed to read asset ${ual}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAssets(sparqlQuery: string): Promise<DkgQueryResultDto> {
    this.logger.verbose(
      `🔍 Executing SPARQL query: ${sparqlQuery.substring(0, 200)}...`,
    );
    try {
      await this.ensureContextGraph();
      const rows = await this.client.query(this.contextGraphId, sparqlQuery);
      this.logger.verbose(`Query returned ${rows.length} results`);
      return { data: rows };
    } catch (error: any) {
      this.logger.error(`SPARQL query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publishAttestation(
    attestation: Record<string, any>,
    oracleRequestId: string,
    instanceId: string,
  ): Promise<string> {
    this.logger.log(
      `🗄️ Publishing attestation to DKG for instance ${instanceId}`,
    );
    this.logger.log(`🔗 Linking to oracle request: ${oracleRequestId}`);

    const enrichedAsset = {
      ...attestation,
      '@context': ['https://schema.org', 'https://w3id.org/did/v1'],
      prov: {
        wasGeneratedBy: {
          '@type': 'mfssia:OracleVerification',
          oracleRequestId,
          verifiedAt: new Date().toISOString(),
          provider: 'Chainlink Functions DON',
        },
      },
    };

    this.logger.debug(
      `Final enriched payload: ${JSON.stringify(enrichedAsset).substring(
        0,
        500,
      )}...`,
    );

    let ual: string;
    let retries = 3;

    while (retries > 0) {
      try {
        this.logger.log(
          `⏳ Attempting DKG publish (attempt ${3 - retries + 1}/3)`,
        );

        const canonical = await canonizeJsonLd(enrichedAsset);
        const name = knowledgeAssetName(
          enrichedAsset['@id'],
          contentHash(canonical),
          'attestation',
        );
        const response = await this.writeKnowledgeAsset(
          name,
          rdfToQuads(canonical, 'application/n-quads'),
        );

        ual = response.UAL;
        this.logger.log(`🎉 DKG anchoring successful: UAL=${ual}`);
        return ual;
      } catch (error: any) {
        retries--;
        this.logger.warn(`DKG publish failed: ${error.message}`);

        if (retries === 0) {
          this.logger.error(
            `Final DKG publish failure for instance ${instanceId}`,
            error.stack,
          );
          throw new BadRequestException(
            `Failed to anchor attestation on DKG: ${error.message}`,
          );
        }

        const delay = 2000 * (3 - retries);
        this.logger.verbose(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unreachable: DKG publish failed after all retries');
  }

  async queryAttestations(did: string, challengeSet?: string): Promise<any> {
    const filter = challengeSet
      ? `FILTER(?challengeSet = "${challengeSet}")`
      : '';
    const query = `
      SELECT ?ual ?validUntil ?verifiedChallenges ?challengeSet
      WHERE {
        ?attestation a mfssia:IdentityAttestation ;
                     mfssia:identity "${did}" ;
                     mfssia:ual ?ual ;
                     mfssia:validUntil ?validUntil .
        OPTIONAL { ?attestation mfssia:verifiedChallenges ?verifiedChallenges }
        OPTIONAL { ?attestation mfssia:challengeSet ?challengeSet }
        ${filter}
      }
      ORDER BY DESC(?validUntil)
    `;

    this.logger.verbose(
      `🔍 Querying attestations for DID=${did}${
        challengeSet ? `, set=${challengeSet}` : ''
      }`,
    );

    try {
      await this.ensureContextGraph();
      const results = await this.client.query(this.contextGraphId, query);
      this.logger.verbose(`Found ${results.length} valid attestations`);
      return { data: results };
    } catch (error: any) {
      this.logger.error(
        `Attestation query failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async publishRdf(
    rdf: string,
    contentType: string = 'text/turtle',
  ): Promise<IAssetResponse> {
    this.logger.log('🧠 Publishing raw RDF graph to DKG');
    this.logger.debug(`RDF size: ${rdf.length} bytes`);
    this.logger.debug(`RDF ${rdf} bytes`);

    if (!rdf || rdf.length < 10) {
      throw new BadRequestException('Empty RDF payload');
    }

    const format = (contentType ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase() as RdfFormat;
    if (!RDF_FORMATS.includes(format)) {
      throw new BadRequestException(
        `Unsupported RDF content type "${contentType}" (supported: ${RDF_FORMATS.join(
          ', ',
        )})`,
      );
    }

    let quads: DkgV10Quad[];
    try {
      quads = rdfToQuads(rdf, format);
    } catch (error: any) {
      throw new BadRequestException(
        `Invalid ${format} payload: ${error.message}`,
      );
    }

    try {
      const response = await this.writeKnowledgeAsset(
        knowledgeAssetName(undefined, contentHash(rdf)),
        quads,
      );

      this.logger.log(`🎉 RDF graph published: UAL=${response.UAL}`);
      return response;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to publish RDF graph: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
