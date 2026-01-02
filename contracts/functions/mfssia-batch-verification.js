// ====================== CONFIGURATION ======================
// Centralized constants for easy tuning and governance review
const CONFIG = {
  WHITELIST: new Set([
    'err.ee',
    'postimees.ee',
    'delfi.ee',
    'bbc.com',
    'reuters.com',
    'apnews.com',
    'cnn.com',
    'nytimes.com',
    'theguardian.com',
    'yle.fi',
  ]),
  EMTAK_PREFIXES: new Set(['01', '62', '72', '85', '31']), // Valid EMTAK section prefixes
  MAX_TEXT: 100000, // Prevent excessive memory usage
  MAX_ENTITIES: 500, // Safety bound for entity spans
  OPTIONAL_BOOST: 0.2, // Confidence boost per passed optional challenge
  DEFAULT_RULE: 'ALL_MANDATORY',
};

// ====================== UTILITY FUNCTIONS ======================
async function sha256(data) {
  // Normalize input and compute SHA-256 hash
  const input = typeof data === 'string' ? data : JSON.stringify(data);
  if (input.length > CONFIG.MAX_TEXT) return '0xtoolong'; // Prevent DoS
  const buffer = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return (
    '0x' +
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

function norm(str) {
  // Normalize strings for case-insensitive comparison
  return (str || '').toString().trim().toLowerCase();
}

// ====================== INDIVIDUAL CHALLENGE VERIFIERS ======================
// Each verifier implements one MFSSIA challenge definition
const Verifiers = {
  // Example A - Baseline Integrity
  'mfssia:C-A-1': (e) => {
    const passed = CONFIG.WHITELIST.has(norm(e.sourceDomainHash || e.source));
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-A-2': async (e) => {
    const h = norm(e.contentHash);
    if (!h.startsWith('0x') || h.length !== 66)
      return { passed: false, confidence: 0 };
    const computed = await sha256(e.content || '');
    const passed = computed === h;
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-A-3': (e) => {
    const c = Date.parse(e.claimedPublishDate),
      s = Date.parse(e.serverTimestamp),
      a = Date.parse(e.archiveEarliestCaptureDate);
    if (isNaN(c + s + a)) return { passed: false, confidence: 0 };
    const passed = a <= c && c <= s + 7 * 86400000; // Within 7 days of server time
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-A-4': (e) => {
    const passed =
      norm(e.authorName).length > 3 &&
      norm(e.authorEmailDomain).includes('.') &&
      norm(e.affiliationRecordHash).match(/^0x[0-9a-f]{64}$/);
    return { passed, confidence: passed ? 1 : 0.3 };
  },
  'mfssia:C-A-5': (e) => {
    const passed =
      norm(e.artifactSignature).length > 100 &&
      e.merkleProof?.length > 10 &&
      norm(e.signerPublicKeyId).startsWith('did:');
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-A-6': (e) => {
    const score = e.networkClusterScore ?? 1;
    const passed = score < 0.45;
    return { passed, confidence: 1 - score };
  },

  // Example B - Entity Referential
  'mfssia:C-B-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-B-2': async (e) => {
    const h = norm(e.contentHash);
    const passed =
      h.length === 66 &&
      h.startsWith('0x') &&
      (await sha256(e.content || '')) === h;
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-B-3': (e) => {
    const ids = e.modelIds || {};
    const passed =
      Object.keys(ids).length >= 2 && norm(e.softwareHash).length === 66;
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-B-4': (e) => {
    const spans = e.spanToTextAlignment || [];
    const text = e.text || '';
    const valid = spans.filter(
      (s) =>
        s.start >= 0 &&
        s.end <= text.length &&
        text.slice(s.start, s.end) === s.text,
    ).length;
    const ratio = spans.length ? valid / spans.length : 0;
    return { passed: ratio >= 0.98, confidence: ratio };
  },
  'mfssia:C-B-5': (e) => ({
    passed: ['person', 'location', 'organization', 'country'].includes(
      norm(e.entityType),
    ),
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-B-6': (e) => ({
    passed: norm(e.stableURIPattern).includes('entity/') && e.noCollisions,
    confidence: passed ? 1 : 0.5,
  }),
  'mfssia:C-B-7': (e) => ({
    passed: (e.articleEntityEdgeCoverage ?? 0) >= 0.99,
    confidence: e.articleEntityEdgeCoverage ?? 0,
  }),
  'mfssia:C-B-8': async (e) => {
    const links = e.wasGeneratedBy || [];
    const computed = await sha256(
      JSON.stringify(
        [...links].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        ),
      ),
    );
    const passed = computed === norm(e.provenanceHash);
    return { passed, confidence: passed ? 1 : 0.2 };
  },
  'mfssia:C-B-9': (e) => {
    const d = e.declaredSteps || [],
      o = e.observedSteps || [];
    const passed = JSON.stringify(d.sort()) === JSON.stringify(o.sort());
    return { passed, confidence: passed ? 1 : 0 };
  },

  // Example C - Economic Classification
  'mfssia:C-C-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-C-2': async (e) => {
    const h = norm(e.contentHash);
    const passed = (await sha256(e.content || '')) === h;
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-C-3': (e) => ({
    passed:
      Object.keys(e.modelIdentifiers || {}).length === 3 &&
      norm(e.softwareHash).length === 66,
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-C-4': (e) => {
    const valid =
      (e.spanAlignment || []).every((s) => s.valid) &&
      Object.keys(e.typeAssignment || {}).length > 0;
    return { passed: valid, confidence: valid ? 1 : 0.5 };
  },
  'mfssia:C-C-5': (e) => ({
    passed:
      norm(e.llmName) &&
      norm(e.llmVersion) &&
      Object.keys(e.parameterProfile || {}).length > 0,
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-C-6': (e) => {
    const score = e.semanticOverlapScore ?? 0;
    return { passed: score >= 0.8, confidence: score };
  },
  'mfssia:C-C-7': (e) => {
    const conf = e.llmConfidence ?? 0;
    const match = e.emtaKLabelMatch === true;
    return { passed: conf >= 0.9 && match, confidence: conf };
  },
  'mfssia:C-C-8': (e) => ({
    passed: (e.confidence ?? 0) >= 0.9,
    confidence: e.confidence ?? 0,
  }),
  'mfssia:C-C-9': async (e) => {
    const links = e.wasGeneratedBy || [];
    const computed = await sha256(JSON.stringify(links));
    const passed = computed === norm(e.provenanceHash) && links.length > 0;
    return { passed, confidence: passed ? 1 : 0.3 };
  },
  'mfssia:C-C-10': (e) => ({
    passed:
      (e.stepList || []).length >= 5 && norm(e.softwareHash).length === 66,
    confidence: passed ? 1 : 0.5,
  }),

  // Example D - Policy-Grade
  'mfssia:C-D-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-D-2': async (e) => {
    const h = norm(e.contentHash);
    const passed = (await sha256(e.content || '')) === h;
    return { passed, confidence: passed ? 1 : 0 };
  },
  'mfssia:C-D-3': (e) => ({
    passed:
      norm(e.modelName) &&
      norm(e.versionHash).length === 66 &&
      norm(e.softwareHash).length === 66,
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-D-4': (e) => ({
    passed: (e.crossConsistencyScore ?? 0) >= 0.85,
    confidence: e.crossConsistencyScore ?? 0,
  }),
  'mfssia:C-D-5': (e) => {
    const conf = e.llmConfidence ?? 0;
    const trace = e.numericExtractionTrace || {};
    return { passed: conf >= 0.9 && trace.exactMatch, confidence: conf };
  },
  'mfssia:C-D-6': (e) => ({
    passed: norm(e.ariregisterSectorMatch) === 'true',
    confidence: passed ? 1 : 0,
  }),
  'mfssia:C-D-7': (e) => {
    const a = Date.parse(e.articleDate),
      i = Date.parse(e.ingestionTime);
    if (isNaN(a + i)) return { passed: false, confidence: 0 };
    const days = (i - a) / 86400000;
    return { passed: days <= 30, confidence: Math.max(0, 1 - days / 90) };
  },
  'mfssia:C-D-8': async (e) => {
    const links = e.wasGeneratedBy || [];
    const computed = await sha256(JSON.stringify(links));
    const passed =
      computed === norm(e.provenanceHash) &&
      links.every((l) => l.triple && l.pipelineRun);
    return { passed, confidence: passed ? 1 : 0.2 };
  },
  'mfssia:C-D-9': (e) => {
    const sig = e.daoSignature || '';
    const passed = /^0x[0-9a-fA-F]{130}$/.test(sig);
    return { passed, confidence: passed ? 1 : 0 };
  },

  default: () => ({ passed: false, confidence: 0 }), // Fallback for unknown challenges
};

// ====================== POLICY ENGINE ======================
function evaluatePolicy(results, mandatory, optional, rule, threshold, minReq) {
  let passedCount = 0,
    totalConf = 0,
    mandatoryOk = true;
  const passedIds = [];

  for (const id of [...mandatory, ...optional]) {
    const r = results[id] || { passed: false, confidence: 0 };
    if (r.passed) {
      passedCount++;
      passedIds.push(id);
    }
    totalConf += r.confidence;
    if (mandatory.includes(id) && !r.passed) mandatoryOk = false;
  }

  const avgConf =
    mandatory.length + optional.length
      ? totalConf / (mandatory.length + optional.length)
      : 0;
  let final = mandatoryOk && passedCount >= minReq;

  if (rule === 'ALL_MANDATORY_AND_THRESHOLD') final &&= avgConf >= threshold;
  else if (rule === 'ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE') {
    const boost = optional.reduce(
      (s, id) =>
        results[id]?.passed
          ? s + results[id].confidence * CONFIG.OPTIONAL_BOOST
          : s,
      0,
    );
    final &&= avgConf + boost >= threshold;
  }

  return {
    finalResult: final ? 'PASS' : 'FAIL',
    passedChallenges: passedIds,
    aggregateConfidence: avgConf,
  };
}

// ====================== MAIN ORCHESTRATOR ======================
async function main() {
  if (args.length < 2) throw new Error('Need evidences and mandatoryIds');

  const evidences = JSON.parse(args[0]); // { challengeId: evidence }
  const mandatory = JSON.parse(args[1]); // ["mfssia:C-A-1", ...]
  const optional = args[2] ? JSON.parse(args[2]) : []; // optional challenges
  const rule = args[3] || CONFIG.DEFAULT_RULE; // aggregation rule
  const threshold = args[4] ? parseFloat(args[4]) : 0.85;
  const minReq = args[5] ? parseInt(args[5], 10) : mandatory.length;

  const results = {};
  for (const id of [...mandatory, ...optional]) {
    results[id] = await (Verifiers[id] || Verifiers.default)(
      evidences[id] || {},
    );
  }

  const policy = evaluatePolicy(
    results,
    mandatory,
    optional,
    rule,
    threshold,
    minReq,
  );

  return Functions.encodeString(
    JSON.stringify({ ...policy, individualResults: results }),
  );
}

return main();
