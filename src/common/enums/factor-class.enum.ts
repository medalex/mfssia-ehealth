/*export enum FactorClass {
  SOURCE_INTEGRITY = 'SourceIntegrity',
  DATA_INTEGRITY = 'DataIntegrity',
  PROCESS_INTEGRITY = 'ProcessIntegrity',
  SEMANTIC = 'Semantic',
  PROVENANCE = 'Provenance',
  GOVERNANCE = 'Governance',

  // // Added from Example A
  // CONTENT_INTEGRITY = 'ContentIntegrity',
  // TEMPORAL_VALIDITY = 'TemporalValidity',
  // AUTHOR_AUTHENTICITY = 'AuthorAuthenticity',
  // DISTRIBUTION_INTEGRITY = 'DistributionIntegrity',

  // Core Example D Factors
  SOURCE_INTEGRITY = 'SourceIntegrity', // Article source authenticity
  PROCESS_INTEGRITY = 'ProcessIntegrity', // Deterministic pipeline execution
  SEMANTIC_CORRECTNESS = 'SemanticCorrectness', // NLP/NER/LLM coherence
  ECONOMIC_CONSISTENCY = 'EconomicConsistency', // EMTAK + registry coherence
  TEMPORAL_VALIDITY = 'TemporalPlausibility', // Time-bounded validity
  PROVENANCE_INTEGRITY = 'ProvenanceIntegrity', // Cryptographic traceability
  INSTITUTIONAL_OVERSIGHT = 'InstitutionalOversight', // Governance countersignature

  // Legacy / cross-example factors (optional, from Example A/B)
  CONTENT_INTEGRITY = 'ContentIntegrity',
  AUTHOR_AUTHENTICITY = 'AuthorAuthenticity',
  DISTRIBUTION_INTEGRITY = 'DistributionIntegrity',
}
  */

export enum FactorClass {
  // SOURCE_INTEGRITY = 'SourceIntegrity',
  // DATA_INTEGRITY = 'DataIntegrity',
  // PROCESS_INTEGRITY = 'ProcessIntegrity',
  // SEMANTIC = 'Semantic',
  // PROVENANCE = 'Provenance',
  // GOVERNANCE = 'Governance',

  // // Added from Example A
  // CONTENT_INTEGRITY = 'ContentIntegrity',
  // TEMPORAL_VALIDITY = 'TemporalValidity',
  // AUTHOR_AUTHENTICITY = 'AuthorAuthenticity',
  // DISTRIBUTION_INTEGRITY = 'DistributionIntegrity',

  // Core Example D Factors
  SOURCE_INTEGRITY = 'SourceIntegrity', // Article source authenticity
  PROCESS_INTEGRITY = 'ProcessIntegrity', // Deterministic pipeline execution
  SEMANTIC_CORRECTNESS = 'SemanticCorrectness', // NLP/NER/LLM coherence
  ECONOMIC_CONSISTENCY = 'EconomicConsistency', // EMTAK + registry coherence
  TEMPORAL_VALIDITY = 'TemporalPlausibility', // Time-bounded validity
  PROVENANCE_INTEGRITY = 'ProvenanceIntegrity', // Cryptographic traceability
  INSTITUTIONAL_OVERSIGHT = 'InstitutionalOversight', // Governance countersignature

  // Legacy / cross-example factors (optional, from Example A/B)
  CONTENT_INTEGRITY = 'ContentIntegrity',
  AUTHOR_AUTHENTICITY = 'AuthorAuthenticity',
  DISTRIBUTION_INTEGRITY = 'DistributionIntegrity',
}