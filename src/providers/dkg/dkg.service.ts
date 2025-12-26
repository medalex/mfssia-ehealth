import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getClient } from 'dkg.js'; // Modern factory import
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DkgQueryResultDto } from './dkg-query-result.dto';
import { NodeInfoResponseDto } from '@/modules/infrastructure/node.-info.dto';

@Injectable()
export class DkgService {
  private readonly logger = new Logger(DkgService.name);
  private readonly dkg: any; // dkg.js client instance

  constructor(private config: ConfigService) {
    const dkgConfig = this.config.get('app.dkg');

    if (!dkgConfig) {
      throw new Error('DKG configuration not found in app config');
    }

    this.dkg = getClient(dkgConfig);
    this.logger.log('DKG client successfully initialized');
  }

  // === Legacy / General Methods (Preserved for existing app usage) ===

  async getDkgNodeInfo(): Promise<NodeInfoResponseDto> {
    this.logger.verbose('Fetching DKG node info');
    return await this.dkg.node.info();
  }

  /**
   * General asset creation — used elsewhere in app
   */
  async createAsset(asset: Record<string, unknown>): Promise<IAssetResponse> {
    try {
      const response = await this.dkg.asset.create(
        { public: asset },
        { epochsNum: 2 },
      );
      this.logger.debug(`Asset created: UAL=${response.UAL}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Error creating asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read asset by UAL — used in general queries
   */
  async readAsset(ual: string): Promise<unknown> {
    this.logger.verbose(`Reading asset from DKG: ${ual}`);
    return await this.dkg.asset.get(ual, {
      validate: true,
      commitOffset: 0,
      maxNumberOfRetries: 5,
      blockchain: this.dkg.blockchain,
    });
  }

  /**
   * SPARQL query — used for general asset search
   */
  async findAssets(sparqlQuery: string): Promise<DkgQueryResultDto> {
    this.logger.verbose(
      `Executing SPARQL query: ${sparqlQuery.substring(0, 100)}...`,
    );
    return await this.dkg.graph.query(sparqlQuery, 'SELECT');
  }

  // === Enhanced Method for Verification Flow ===

  /**
   * Publish Identity Attestation to DKG after successful oracle verification
   * @param attestation Core attestation data
   * @param oracleRequestId Chainlink Functions request ID (provenance)
   * @param instanceId MFSSIA challenge instance ID (for logging)
   * @returns UAL of the published asset
   */
  async publishAttestation(
    attestation: Record<string, any>,
    oracleRequestId: string,
    instanceId: string,
  ): Promise<string> {
    this.logger.log(
      `🗄️ Publishing attestation to DKG for instance ${instanceId} (oracleRequestId=${oracleRequestId})`,
    );

    // Enrich with strong provenance
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

    this.logger.verbose(
      `Final asset payload: ${JSON.stringify(enrichedAsset).substring(
        0,
        500,
      )}...`,
    );

    let ual: string;
    let retries = 3;

    while (retries > 0) {
      try {
        const response: IAssetResponse = await this.dkg.asset.create(
          { public: enrichedAsset },
          {
            epochsNum: 3, // Higher replication for critical attestations
            maxNumberOfRetries: 5,
            frequency: 2,
          },
        );

        ual = response.UAL;
        this.logger.log(`✅ DKG anchoring successful: UAL=${ual}`);
        return ual;
      } catch (error: any) {
        retries--;
        this.logger.warn(
          `DKG publish attempt failed (${3 - retries}/3): ${error.message}`,
        );

        if (retries === 0) {
          this.logger.error(
            `Final DKG publish failure for instance ${instanceId}`,
            error.stack,
          );
          throw new BadRequestException(
            `Failed to anchor attestation on DKG: ${error.message}`,
          );
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 * (3 - retries)),
        );
      }
    }

    throw new Error('Unreachable: DKG publish failed after retries');
  }

  /**
   * Dedicated query for returning user fast path — optimized for attestation lookup
   */
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
      `Querying attestations for DID=${did}${
        challengeSet ? `, set=${challengeSet}` : ''
      }`,
    );
    return await this.dkg.graph.query(query, 'SELECT');
  }
}
