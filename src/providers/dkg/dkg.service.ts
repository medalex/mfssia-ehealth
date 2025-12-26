import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DKGClient from 'dkg.js'; // ← Correct default import
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DkgQueryResultDto } from './dkg-query-result.dto';
import { NodeInfoResponseDto } from '@/modules/infrastructure/node.-info.dto';

@Injectable()
export class DkgService {
  private readonly logger = new Logger(DkgService.name);
  private readonly dkg: any; // DKG client instance

  constructor(private config: ConfigService) {
    this.logger.log('🔧 Initializing DKG client...');

    const dkgConfig = this.config.get<any>('app.dkg'); // Should be object: { endpoint, blockchain, etc. }

    if (!dkgConfig) {
      this.logger.error('❌ DKG configuration not found in app config');
      throw new Error('DKG configuration missing');
    }

    try {
      // Correct instantiation
      this.dkg = new DKGClient(dkgConfig);

      this.logger.log('✅ DKG client successfully initialized');
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize DKG client: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // === Rest of your methods remain exactly the same ===
  async getDkgNodeInfo(): Promise<NodeInfoResponseDto> {
    this.logger.verbose('📡 Fetching DKG node info');
    try {
      const info = await this.dkg.node.info();
      this.logger.verbose(
        `Node info retrieved: version=${info.version}, network=${info.network}`,
      );
      return info;
    } catch (error: any) {
      this.logger.error(`Failed to fetch node info: ${error.message}`);
      throw error;
    }
  }

  async createAsset(asset: Record<string, unknown>): Promise<IAssetResponse> {
    this.logger.log('🗄️ Creating general DKG asset');
    this.logger.debug(
      `Asset payload: ${JSON.stringify(asset).substring(0, 300)}...`,
    );

    try {
      const response = await this.dkg.asset.create(
        { public: asset },
        { epochsNum: 2 },
      );

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
      const asset = await this.dkg.asset.get(ual, {
        validate: true,
        commitOffset: 0,
        maxNumberOfRetries: 5,
        blockchain: this.dkg.blockchain,
      });

      this.logger.verbose(`✅ Asset retrieved successfully from DKG`);
      return asset;
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
      const result = await this.dkg.graph.query(sparqlQuery, 'SELECT');
      this.logger.verbose(`Query returned ${result.length} results`);
      return result;
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

        const response: IAssetResponse = await this.dkg.asset.create(
          { public: enrichedAsset },
          {
            epochsNum: 3,
            maxNumberOfRetries: 5,
            frequency: 2,
          },
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
      const results = await this.dkg.graph.query(query, 'SELECT');
      this.logger.verbose(`Found ${results.length} valid attestations`);
      return results;
    } catch (error: any) {
      this.logger.error(
        `Attestation query failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
