import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';
import { CONSENT_ACCESS_DOCUMENTS } from './consent-access.challenges';

// Two-factor gate for physician access to patient data:
//   C-DOC-AUTH  — authentication (who you are: signature + registry membership)
//   C-DOC-AUTHZ — authorization (consent covers your organization)
// Both mandatory (ALL_MANDATORY). Challenge definitions and the set are static —
// published once to DKG at startup, reused for every access instance.
@Injectable()
export class ConsentAccessSeedService implements OnModuleInit {
  private readonly logger = new Logger(ConsentAccessSeedService.name);

  constructor(private readonly dkgService: DkgService) {}

  async onModuleInit() {
    // Idempotent: skip if the challenge set is already anchored in DKG
    if (await this.alreadyPublished()) {
      this.logger.log(
        'ConsentAccessSet already in DKG — skipping consent-access seed',
      );
      return;
    }

    for (const asset of CONSENT_ACCESS_DOCUMENTS) {
      try {
        const response = await this.dkgService.createAsset(asset as any);
        this.logger.log(`Published ${asset['@id']} → UAL=${response.UAL}`);
      } catch (e: any) {
        this.logger.warn(`Failed to publish ${asset['@id']}: ${e.message}`);
      }
    }
  }

  private async alreadyPublished(): Promise<boolean> {
    try {
      const sparql = `
        PREFIX mfssia: <https://mfssia.org/ontology#>
        SELECT ?s WHERE {
          ?s a mfssia:ChallengeSet ;
             mfssia:code "ConsentAccessSet" .
        }
      `;
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      return Array.isArray(rows) && rows.length > 0;
    } catch (e: any) {
      this.logger.warn(`DKG check failed, will attempt publish: ${e.message}`);
      return false;
    }
  }
}
