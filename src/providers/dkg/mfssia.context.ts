// src/dkg/contexts/mfssia.context.ts
export const MFSSIA_CONTEXT = {
  // ===== namespace =====
  mfssia: 'https://mfssia.org/ontology#',

  // ===== core identifiers =====
  id: '@id',
  code: 'mfssia:code',
  name: 'mfssia:name',
  description: 'mfssia:description',

  // ===== challenge semantics (scalar) =====
  factorClass: 'mfssia:factorClass',
  question: 'mfssia:question',
  failureEffect: 'mfssia:failureEffect',
  reusability: 'mfssia:reusability',
  version: 'mfssia:version',
  status: 'mfssia:status',

  // ===== complex / nested structures =====
  // Treated as opaque JSON blobs to satisfy safe mode
  expectedEvidence: {
    '@id': 'mfssia:expectedEvidence',
    '@type': '@json',
  },

  oracle: {
    '@id': 'mfssia:oracle',
    '@type': '@json',
  },

  evaluation: {
    '@id': 'mfssia:evaluation',
    '@type': '@json',
  },

  // ===== relations (ONLY via @id / UAL) =====
  challengeSets: {
    '@id': 'mfssia:challengeSet',
    '@type': '@id',
  },

  // ===== technical metadata =====
  createdAt: {
    '@id': 'mfssia:createdAt',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },

  updatedAt: {
    '@id': 'mfssia:updatedAt',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },

  // ===== challenge set semantics =====
  publishedBy: {
    '@id': 'mfssia:publishedBy',
    '@type': '@json',
  },

  policy: {
    '@id': 'mfssia:policy',
    '@type': '@json',
  },

  lifecycle: {
    '@id': 'mfssia:lifecycle',
    '@type': '@json',
  },

  mandatoryChallenges: {
    '@id': 'mfssia:mandatoryChallenge',
    '@type': '@id', // ссылки на ChallengeDefinition assets
  },

  optionalChallenges: {
    '@id': 'mfssia:optionalChallenge',
    '@type': '@id',
  },

  // ======================================================================
  // ===== MFSSIA ATTESTATION SEMANTICS ===================================
  // ======================================================================

  // DID of the subject being attested
  identity: {
    '@id': 'mfssia:identity',
    '@type': '@id',
  },
  
  challengeSet: 'mfssia:challengeSet',

  // Successfully verified ChallengeDefinition assets
  verifiedChallenges: {
    '@id': 'mfssia:verifiedChallenge',
    '@type': '@id',
  },

  // Oracle proof / requestId / composite evidence
  oracleAttestation: {
    '@id': 'mfssia:oracleAttestation',
  },

  // Aggregation rule used to compute the attestation result
  aggregationRule: {
    '@id': 'mfssia:aggregationRule',
  },

  // Validity window
  validFrom: {
    '@id': 'mfssia:validFrom',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },

  validUntil: {
    '@id': 'mfssia:validUntil',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },

  // DKG anchoring reference (UAL of this attestation)
  ual: {
    '@id': 'mfssia:ual',
    '@type': '@id',
  },
} as const;
