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
} as const;
