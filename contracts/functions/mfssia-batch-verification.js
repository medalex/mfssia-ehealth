// ============================================================
// MFSSIA CHAINLINK FUNCTIONS — FULL BATCH VERIFIER (A, B, C, D)
// Production-safe, ≤256 bytes response
// ============================================================

// ---------------- CONFIGURATION ----------------
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
  MAX_TEXT: 100_000,
  OPTIONAL_BOOST: 0.2,
  DEFAULT_RULE: 'ALL_MANDATORY',
};

// ---------------- CHALLENGE INDEX ----------------
// Assign each challenge a unique bit (0..255) for the bitmask
const CHALLENGE_INDEX = {
  // Example A
  'mfssia:C-A-1': 0,
  'mfssia:C-A-2': 1,
  'mfssia:C-A-3': 2,
  'mfssia:C-A-4': 3,
  'mfssia:C-A-5': 4,
  'mfssia:C-A-6': 5,
  // Example B
  'mfssia:C-B-1': 6,
  'mfssia:C-B-2': 7,
  'mfssia:C-B-3': 8,
  'mfssia:C-B-4': 9,
  'mfssia:C-B-5': 10,
  'mfssia:C-B-6': 11,
  'mfssia:C-B-7': 12,
  'mfssia:C-B-8': 13,
  'mfssia:C-B-9': 14,
  // Example C
  'mfssia:C-C-1': 15,
  'mfssia:C-C-2': 16,
  'mfssia:C-C-3': 17,
  'mfssia:C-C-4': 18,
  'mfssia:C-C-5': 19,
  'mfssia:C-C-6': 20,
  'mfssia:C-C-7': 21,
  'mfssia:C-C-8': 22,
  'mfssia:C-C-9': 23,
  'mfssia:C-C-10': 24,
  // Example D
  'mfssia:C-D-1': 25,
  'mfssia:C-D-2': 26,
  'mfssia:C-D-3': 27,
  'mfssia:C-D-4': 28,
  'mfssia:C-D-5': 29,
  'mfssia:C-D-6': 30,
  'mfssia:C-D-7': 31,
  'mfssia:C-D-8': 32,
  'mfssia:C-D-9': 33,
};

// ---------------- UTILS ----------------
function norm(v) {
  return (v ?? '').toString().trim().toLowerCase();
}
async function sha256(data) {
  const input = typeof data === 'string' ? data : JSON.stringify(data);
  if (input.length > CONFIG.MAX_TEXT) return '0xtoolong';
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return (
    '0x' +
    [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

// ---------------- VERIFIERS ----------------
const Verifiers = {
  // ---------------- Example A ----------------
  'mfssia:C-A-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.sourceDomainHash || e.source)),
    confidence: 1,
  }),
  'mfssia:C-A-2': async (e) => ({
    passed:
      /^0x[0-9a-f]{64}$/.test(norm(e.contentHash)) &&
      (await sha256(e.content || '')) === e.contentHash,
    confidence: 1,
  }),
  'mfssia:C-A-3': (e) => {
    const c = Date.parse(e.claimedPublishDate),
      s = Date.parse(e.serverTimestamp),
      a = Date.parse(e.archiveEarliestCaptureDate);
    return {
      passed: !isNaN(c + s + a) && a <= c && c <= s + 7 * 86400000,
      confidence: 1,
    };
  },
  'mfssia:C-A-4': (e) => ({
    passed:
      norm(e.authorName).length > 3 &&
      norm(e.authorEmailDomain).includes('.') &&
      /^0x[0-9a-f]{64}$/.test(norm(e.affiliationRecordHash)),
    confidence: 0.3,
  }),
  'mfssia:C-A-5': (e) => ({
    passed:
      norm(e.artifactSignature).length > 100 &&
      (e.merkleProof?.length ?? 0) > 10 &&
      norm(e.signerPublicKeyId).startsWith('did:'),
    confidence: 1,
  }),
  'mfssia:C-A-6': (e) => {
    const score = e.networkClusterScore ?? 1;
    return { passed: score < 0.45, confidence: Math.max(0, 1 - score) };
  },

  // ---------------- Example B ----------------
  'mfssia:C-B-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: 1,
  }),
  'mfssia:C-B-2': async (e) => ({
    passed:
      /^0x[0-9a-f]{64}$/.test(norm(e.contentHash)) &&
      (await sha256(e.content || '')) === e.contentHash,
    confidence: 1,
  }),
  'mfssia:C-B-3': (e) => {
    const ids = e.modelIds || {};
    return {
      passed:
        Object.keys(ids).length >= 2 && norm(e.softwareHash).length === 66,
      confidence: 1,
    };
  },
  'mfssia:C-B-4': (e) => {
    const spans = e.spanToTextAlignment || [],
      text = e.text || '';
    const valid = spans.filter(
      (s) =>
        s.start >= 0 &&
        s.end <= text.length &&
        text.slice(s.start, s.end) === s.text,
    ).length;
    return {
      passed: spans.length ? valid / spans.length >= 0.98 : false,
      confidence: spans.length ? valid / spans.length : 0,
    };
  },
  'mfssia:C-B-5': (e) => ({
    passed: ['person', 'location', 'organization', 'country'].includes(
      norm(e.entityType),
    ),
    confidence: 1,
  }),
  'mfssia:C-B-6': (e) => ({
    passed: norm(e.stableURIPattern).includes('entity/') && e.noCollisions,
    confidence: 0.5,
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
    return { passed: computed === norm(e.provenanceHash), confidence: 0.2 };
  },
  'mfssia:C-B-9': (e) => {
    const d = e.declaredSteps || [],
      o = e.observedSteps || [];
    return {
      passed: JSON.stringify(d.sort()) === JSON.stringify(o.sort()),
      confidence: 1,
    };
  },

  // ---------------- Example C ----------------
  'mfssia:C-C-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: 1,
  }),
  'mfssia:C-C-2': async (e) => ({
    passed: (await sha256(e.content || '')) === norm(e.contentHash),
    confidence: 1,
  }),
  'mfssia:C-C-3': (e) => ({
    passed:
      Object.keys(e.modelIdentifiers || {}).length === 3 &&
      norm(e.softwareHash).length === 66,
    confidence: 1,
  }),
  'mfssia:C-C-4': (e) => {
    const valid =
      (e.spanAlignment || []).every((s) => s.valid) &&
      Object.keys(e.typeAssignment || {}).length > 0;
    return { passed: valid, confidence: 0.5 };
  },
  'mfssia:C-C-5': (e) => ({
    passed:
      !!norm(e.llmName) &&
      !!norm(e.llmVersion) &&
      Object.keys(e.parameterProfile || {}).length > 0,
    confidence: 1,
  }),
  'mfssia:C-C-6': (e) => {
    const score = e.semanticOverlapScore ?? 0;
    return { passed: score >= 0.8, confidence: score };
  },
  'mfssia:C-C-7': (e) => {
    const conf = e.llmConfidence ?? 0;
    return {
      passed: conf >= 0.9 && e.emtaKLabelMatch === true,
      confidence: conf,
    };
  },
  'mfssia:C-C-8': (e) => ({
    passed: (e.confidence ?? 0) >= 0.9,
    confidence: e.confidence ?? 0,
  }),
  'mfssia:C-C-9': async (e) => {
    const links = e.wasGeneratedBy || [];
    const computed = await sha256(JSON.stringify(links));
    return {
      passed: computed === norm(e.provenanceHash) && links.length > 0,
      confidence: 0.3,
    };
  },
  'mfssia:C-C-10': (e) => ({
    passed:
      (e.stepList || []).length >= 5 && norm(e.softwareHash).length === 66,
    confidence: 0.5,
  }),

  // ---------------- Example D ----------------
  'mfssia:C-D-1': (e) => ({
    passed: CONFIG.WHITELIST.has(norm(e.source)),
    confidence: 1,
  }),
  'mfssia:C-D-2': async (e) => ({
    passed: (await sha256(e.content || '')) === norm(e.contentHash),
    confidence: 1,
  }),
  'mfssia:C-D-3': (e) => ({
    passed:
      !!norm(e.modelName) &&
      norm(e.versionHash).length === 66 &&
      norm(e.softwareHash).length === 66,
    confidence: 1,
  }),
  'mfssia:C-D-4': (e) => ({
    passed: (e.crossConsistencyScore ?? 0) >= 0.85,
    confidence: e.crossConsistencyScore ?? 0,
  }),
  'mfssia:C-D-5': (e) => {
    const conf = e.llmConfidence ?? 0,
      trace = e.numericExtractionTrace || {};
    return { passed: conf >= 0.9 && trace.exactMatch, confidence: conf };
  },
  'mfssia:C-D-6': (e) => ({
    passed: norm(e.ariregisterSectorMatch) === 'true',
    confidence: 1,
  }),
  'mfssia:C-D-7': (e) => {
    const days =
      (Date.parse(e.ingestionTime) - Date.parse(e.articleDate)) / 86400000;
    return { passed: days <= 30, confidence: Math.max(0, 1 - days / 90) };
  },
  'mfssia:C-D-8': async (e) => {
    const links = e.wasGeneratedBy || [];
    const computed = await sha256(JSON.stringify(links));
    return {
      passed:
        computed === norm(e.provenanceHash) &&
        links.every((l) => l.triple && l.pipelineRun),
      confidence: 0.2,
    };
  },
  'mfssia:C-D-9': (e) => ({
    passed: /^0x[0-9a-fA-F]{130}$/.test(e.daoSignature || ''),
    confidence: 1,
  }),

  default: () => ({ passed: false, confidence: 0 }),
};

// ---------------- POLICY ----------------
function evaluatePolicy(results, mandatory, optional, rule, threshold, minReq) {
  let passedCount = 0,
    confSum = 0,
    mandatoryOk = true;
  for (const id of [...mandatory, ...optional]) {
    const r = results[id] || { passed: false, confidence: 0 };
    if (r.passed) passedCount++;
    confSum += r.confidence;
    if (mandatory.includes(id) && !r.passed) mandatoryOk = false;
  }
  const avgConf =
    mandatory.length + optional.length > 0
      ? confSum / (mandatory.length + optional.length)
      : 0;
  let final = mandatoryOk && passedCount >= minReq;
  if (rule === 'ALL_MANDATORY_AND_THRESHOLD') final &&= avgConf >= threshold;
  return { passed: final, confidence: avgConf };
}

// ---------------- BITMASK ----------------
function buildBitmask(results) {
  let mask = 0n;
  for (const [id, r] of Object.entries(results)) {
    if (r?.passed && CHALLENGE_INDEX[id] !== undefined)
      mask |= 1n << BigInt(CHALLENGE_INDEX[id]);
  }
  return mask;
}

// ---------------- MAIN ----------------
async function main() {
  if (args.length < 2) throw new Error('Need evidences and mandatory');
  const evidences = JSON.parse(args[0]);
  const mandatory = JSON.parse(args[1]);
  const optional = args[2] ? JSON.parse(args[2]) : [];
  const rule = args[3] || CONFIG.DEFAULT_RULE;
  const threshold = args[4] ? Number(args[4]) : 0;
  const minReq = args[5] ? Number(args[5]) : mandatory.length;

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
  const response = {
    v: 1,
    r: policy.passed ? 1 : 0,
    c: Math.floor(policy.confidence * 10000),
    m: '0x' + buildBitmask(results).toString(16).padStart(64, '0'),
  };
  return Functions.encodeString(JSON.stringify(response));
}

return main();
