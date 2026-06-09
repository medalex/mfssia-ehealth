export const RX_CONTEXT = {
  rx: 'https://mfssia.io/ontology/prescription#',
  mfssia: 'https://mfssia.org/ontology#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  prov: 'http://www.w3.org/ns/prov#',

  // ── Policy ────────────────────────────────────────────────────────────────
  appliesToMedication: {
    '@id': 'rx:appliesToMedication',
    '@type': '@id',
  },
  clinicalCondition: 'rx:clinicalCondition',
  comparisonOperator: 'rx:comparisonOperator',
  threshold: {
    '@id': 'rx:threshold',
    '@type': 'xsd:decimal',
  },
  conditionalThreshold: 'rx:conditionalThreshold',
  deltaMax: {
    '@id': 'rx:deltaMax',
    '@type': 'xsd:integer',
  },

  // ── Shared metadata ───────────────────────────────────────────────────────
  name: 'rx:name',
  publishedAt: {
    '@id': 'prov:generatedAtTime',
    '@type': 'xsd:dateTime',
  },
} as const;
