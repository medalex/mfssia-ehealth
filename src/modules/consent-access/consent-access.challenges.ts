import { MFSSIA_CONTEXT } from '@/providers/dkg/mfssia.context';

// Static governance documents anchored in the DKG for the physician-access gate:
//   C-DOC-AUTH  — authentication (DID signature + registry membership)
//   C-DOC-AUTHZ — authorization (consent covers the physician's organization)
//   ConsentAccessSet — the two-factor set (ALL_MANDATORY) binding them together.
// Exported so both the DKG seed and the API (challenge/response evidence) use the
// exact same documents that are published to the DKG.

export const CHALLENGE_AUTH = {
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

export const CHALLENGE_AUTHZ = {
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

export const CONSENT_ACCESS_SET = {
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

export const CONSENT_ACCESS_DOCUMENTS = [
  CHALLENGE_AUTH,
  CHALLENGE_AUTHZ,
  CONSENT_ACCESS_SET,
];
