import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';
import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';

// Two-factor gate for physician access to patient data:
//   C-DOC-AUTH  — authentication (who you are: signature + registry membership)
//   C-DOC-AUTHZ — authorization (consent covers your organization)
// Both mandatory (ALL_MANDATORY). Challenge definitions and the set are static —
// published once to DKG at startup, reused for every access instance.

const CHALLENGE_AUTH = {
  '@context': MFSSIA_CONTEXT,
  '@type': 'mfssia:ChallengeDefinition',
  '@id': 'urn:challenge-definition:C-DOC-AUTH',
  code: 'C-DOC-AUTH',
  name: 'Physician Authentication',
  description:
    'Physician proves control of their DID and membership in the governance-approved physician registry (root_M).',
  factorClass: 'AuthorAuthenticity',
  question:
    'Sign the challenge nonce with your DID key and prove your credential is in the physician registry.',
  expectedEvidence: [
    { type: 'signature', name: 'nonceSignature', dataType: 'string' },
    { type: 'credential', name: 'credentialHash', dataType: 'string' },
  ],
  oracle: {
    type: 'verifier',
    name: 'PhysicianRegistryVerifier',
    oracleType: 'internal-merkle',
    verificationMethod:
      'verify nonceSignature against DID key AND verify credentialHash Merkle membership in root_M',
  },
  evaluation: {
    resultType: 'boolean',
    passCondition: 'signatureValid AND credentialInRegistry',
  },
  failureEffect: 'Access denied — physician not authenticated.',
  reusability: 'single-use',
  version: '1.0',
  status: 'Active',
};

const CHALLENGE_AUTHZ = {
  '@context': MFSSIA_CONTEXT,
  '@type': 'mfssia:ChallengeDefinition',
  '@id': 'urn:challenge-definition:C-DOC-AUTHZ',
  code: 'C-DOC-AUTHZ',
  name: 'Patient Data Access Authorization',
  description:
    "Verify the physician's organization is covered by the patient's DataSharingConsent anchored in DKG.",
  factorClass: 'Governance',
  question:
    'Prove that the patient has granted data-sharing consent covering your organization.',
  expectedEvidence: [
    { type: 'reference', name: 'patientId', dataType: 'string' },
    { type: 'reference', name: 'organizationId', dataType: 'string' },
  ],
  oracle: {
    type: 'verifier',
    name: 'ConsentLookup',
    oracleType: 'dkg-sparql',
    verificationMethod:
      'ASK { ?c a rx:DataSharingConsent ; rx:patient ?patientId ; rx:consentCovers ?organizationId ; rx:validUntil ?t . FILTER(?t > NOW()) } AND physician.organizationId == organizationId',
  },
  evaluation: {
    resultType: 'boolean',
    passCondition:
      'consentExists AND consentCoversOrg AND notExpired AND physicianBelongsToOrg',
  },
  failureEffect:
    'Access denied — no valid patient consent for this organization.',
  reusability: 'reusable',
  version: '1.0',
  status: 'Active',
};

const CONSENT_ACCESS_SET = {
  '@context': MFSSIA_CONTEXT,
  '@type': 'mfssia:ChallengeSet',
  '@id': 'urn:challenge-set:ConsentAccessSet',
  code: 'ConsentAccessSet',
  name: 'Physician Data Access Set',
  description:
    'Two-factor gate for physician access to patient data: authentication (who you are) + authorization (consent covers your org). Both mandatory.',
  version: '1.0',
  status: 'Active',
  publishedBy: { type: 'Organization', name: 'MFSSIA' },
  mandatoryChallenges: [
    'urn:challenge-definition:C-DOC-AUTH',
    'urn:challenge-definition:C-DOC-AUTHZ',
  ],
  optionalChallenges: [],
  policy: {
    minChallengesRequired: 2,
    aggregationRule: 'ALL_MANDATORY',
    confidenceThreshold: null,
  },
  lifecycle: {
    creationEvent: 'MFSSIA governance onboarding',
    mutation: 'versioned',
    deprecationPolicy: 'supersede-by-version',
  },
};

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

    const assets = [CHALLENGE_AUTH, CHALLENGE_AUTHZ, CONSENT_ACCESS_SET];
    for (const asset of assets) {
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
