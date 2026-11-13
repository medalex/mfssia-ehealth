// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import { ChallengeDefinitionDkgMapper } from '@/modules/challenge-definitions/challenge-definition.dkg.mapper';
import { MfssiaAttestationDkgMapper } from '@/modules/mfssia-attestation/mfssia-attestation.dkg.mapper';
import { MFSSIA_CONTEXT } from './mfssia.context';
import { DkgV10Quad } from './dkg-v10.client';
import { jsonLdToQuads, rdfToQuads } from './rdf-quads';

const MFSSIA = 'https://mfssia.org/ontology#';
const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDF_JSON = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON';

const objectsOf = (quads: DkgV10Quad[], subject: string, predicate: string) =>
  quads
    .filter((q) => q.subject === subject && q.predicate === predicate)
    .map((q) => q.object);

const allTerms = (quads: DkgV10Quad[]) =>
  quads.flatMap((q) => [q.subject, q.predicate, q.object]);

describe('jsonLdToQuads — MFSSIA payloads', () => {
  it('challenge definition: scalars become literals, @json fields one rdf:JSON literal each', async () => {
    const payload = ChallengeDefinitionDkgMapper.toDkgDto({
      code: 'mfssia:C-A-1',
      name: 'Source Authenticity Challenge',
      description:
        'Verifies the article originates from an approved "public-sector" publisher.\nSecond line.',
      factorClass: 'SourceIntegrity',
      question: 'Does the article originate from a whitelisted source?',
      expectedEvidence: [
        { type: 'mfssia:EvidenceType', name: 'source', dataType: 'string' },
      ],
      oracle: {
        type: 'mfssia:Oracle',
        name: 'Publisher Whitelist Oracle',
        oracleType: 'CHAINLINK',
        verificationMethod: 'Compare source against DAO-approved list',
      },
      evaluation: {
        resultType: 'assertions',
        passCondition: 'source ∈ whitelist',
      },
      failureEffect: 'Pipeline execution rejected',
      reusability: 'GLOBAL',
      version: '1.0',
      status: 'ACTIVE',
    } as any);
    const id = 'urn:challenge-definition:mfssia:C-A-1';

    const quads = await jsonLdToQuads(payload);

    expect(objectsOf(quads, id, RDF_TYPE)).toEqual([
      `${MFSSIA}ChallengeDefinition`,
    ]);
    expect(objectsOf(quads, id, `${MFSSIA}code`)).toEqual(['"mfssia:C-A-1"']);
    expect(objectsOf(quads, id, `${MFSSIA}description`)).toEqual([
      '"Verifies the article originates from an approved \\"public-sector\\" publisher.\\nSecond line."',
    ]);
    const [evidence] = objectsOf(quads, id, `${MFSSIA}expectedEvidence`);
    expect(evidence.endsWith(`^^<${RDF_JSON}>`)).toBe(true);
    const evidenceJson = evidence
      .slice(1, evidence.lastIndexOf('"^^'))
      .replace(/\\"/g, '"');
    expect(JSON.parse(evidenceJson)).toEqual([
      { dataType: 'string', name: 'source', type: 'mfssia:EvidenceType' },
    ]);
    expect(objectsOf(quads, id, `${MFSSIA}evaluation`)[0]).toContain(
      'source ∈ whitelist',
    );
    expect(quads).toHaveLength(13);
  });

  it('rx lab result: typed literals keep their datatype, references stay IRIs', async () => {
    const id =
      'urn:lab-result:pilot-00000000-0000-0000-0000-000000000001-lab-b-egfr';
    const quads = await jsonLdToQuads({
      '@context': { rx: RX, xsd: XSD },
      '@id': id,
      '@type': 'rx:LabResult',
      'rx:hasPatient': {
        '@id': 'urn:patient:00000000-0000-0000-0000-000000000001',
      },
      'rx:hasMetric': 'eGFR',
      'rx:hasValue': { '@value': '20', '@type': 'xsd:decimal' },
      'rx:hasUnit': 'mL/min/1.73m2',
      'rx:hasSource': { '@id': 'urn:org:lab-b' },
      'rx:hasTimestamp': {
        '@value': '2026-10-03T00:00:00.000Z',
        '@type': 'xsd:dateTime',
      },
    });

    expect(objectsOf(quads, id, RDF_TYPE)).toEqual([`${RX}LabResult`]);
    expect(objectsOf(quads, id, `${RX}hasValue`)).toEqual([
      `"20"^^<${XSD}decimal>`,
    ]);
    expect(objectsOf(quads, id, `${RX}hasTimestamp`)).toEqual([
      `"2026-10-03T00:00:00.000Z"^^<${XSD}dateTime>`,
    ]);
    expect(objectsOf(quads, id, `${RX}hasPatient`)).toEqual([
      'urn:patient:00000000-0000-0000-0000-000000000001',
    ]);
    expect(objectsOf(quads, id, `${RX}hasMetric`)).toEqual(['"eGFR"']);
    expect(quads).toHaveLength(7);
  });

  it('attestation: DID becomes an IRI, dateTimes are typed, a null field is left out', async () => {
    const payload = MfssiaAttestationDkgMapper.toDkgDto({
      identity: 'did:example:123',
      challengeSet: 'mfssia:Example-A',
      verifiedChallenges: [
        'urn:challenge-definition:mfssia:C-A-1',
        'urn:challenge-definition:mfssia:C-A-2',
      ],
      oracleAttestation: '0xproof',
      aggregationRule: 'ALL_MANDATORY',
      validFrom: new Date('2026-11-13T00:00:00.000Z'),
      validUntil: new Date('2027-11-13T00:00:00.000Z'),
      ual: undefined,
    } as any);
    const id = 'urn:mfssia:attestation:did:example:123:mfssia:Example-A';

    const quads = await jsonLdToQuads(payload);

    expect(objectsOf(quads, id, `${MFSSIA}identity`)).toEqual([
      'did:example:123',
    ]);
    expect(objectsOf(quads, id, `${MFSSIA}verifiedChallenge`).sort()).toEqual([
      'urn:challenge-definition:mfssia:C-A-1',
      'urn:challenge-definition:mfssia:C-A-2',
    ]);
    expect(objectsOf(quads, id, `${MFSSIA}validUntil`)).toEqual([
      `"2027-11-13T00:00:00.000Z"^^<${XSD}dateTime>`,
    ]);
    expect(objectsOf(quads, id, `${MFSSIA}ual`)).toEqual([]);
  });

  it('attestation as publishAttestation wraps it: remote contexts load locally, blank nodes become uuid: IRIs', async () => {
    const id = 'urn:mfssia:attestation:did:example:123:mfssia:Example-A';
    const quads = await jsonLdToQuads({
      '@id': id,
      '@type': 'mfssia:Attestation',
      identity: 'did:example:123',
      '@context': ['https://schema.org', 'https://w3id.org/did/v1'],
      prov: {
        wasGeneratedBy: {
          '@type': 'mfssia:OracleVerification',
          oracleRequestId: '0xrequest',
          verifiedAt: '2026-11-13T00:00:00.000Z',
          provider: 'Chainlink Functions DON',
        },
      },
    });

    // schema.org declares "prov" as the PROV namespace prefix, so the key maps to that IRI.
    const [prov] = objectsOf(quads, id, 'http://www.w3.org/ns/prov#');
    expect(prov).toMatch(/^uuid:[0-9a-f-]{36}$/);
    const [generatedBy] = objectsOf(
      quads,
      prov,
      'http://schema.org/wasGeneratedBy',
    );
    expect(generatedBy).toMatch(/^uuid:[0-9a-f-]{36}$/);
    expect(objectsOf(quads, generatedBy, 'http://schema.org/provider')).toEqual(
      ['"Chainlink Functions DON"'],
    );
    expect(allTerms(quads).some((t) => t.startsWith('_:'))).toBe(false);
  });
});

describe('jsonLdToQuads — refusals', () => {
  it('a term the context does not define fails instead of being dropped (safe mode)', async () => {
    await expect(
      jsonLdToQuads({
        '@context': MFSSIA_CONTEXT,
        '@id': 'urn:x',
        code: 'C',
        notInContext: 'lost?',
      }),
    ).rejects.toThrow(/notInContext|safe mode/i);
  });

  it('a remote context without a local copy is not fetched', async () => {
    await expect(
      jsonLdToQuads({
        '@context': 'https://example.org/context.jsonld',
        '@id': 'urn:x',
        name: 'y',
      }),
    ).rejects.toThrow(
      /https:\/\/example\.org\/context\.jsonld is not available locally/,
    );
  });
});

describe('rdfToQuads — Turtle', () => {
  it('parses prefixes, comments, multi-line statements, language tags and blank nodes', () => {
    const quads = rdfToQuads(`
      @prefix rx: <${RX}> .
      @prefix xsd: <${XSD}> .
      # a comment line
      <urn:policy:metformin-egfr> a rx:Policy ;
          rx:appliesToMedication rx:Metformin ;
          rx:threshold "30"^^xsd:decimal ;
          rx:name "Metformin eGFR rule"@en ;
          rx:conditionalThreshold [ rx:threshold "45"^^xsd:decimal ] .
    `);

    const s = 'urn:policy:metformin-egfr';
    expect(objectsOf(quads, s, RDF_TYPE)).toEqual([`${RX}Policy`]);
    expect(objectsOf(quads, s, `${RX}threshold`)).toEqual([
      `"30"^^<${XSD}decimal>`,
    ]);
    expect(objectsOf(quads, s, `${RX}name`)).toEqual([
      '"Metformin eGFR rule"@en',
    ]);
    const [conditional] = objectsOf(quads, s, `${RX}conditionalThreshold`);
    expect(conditional).toMatch(/^uuid:/);
    expect(objectsOf(quads, conditional, `${RX}threshold`)).toEqual([
      `"45"^^<${XSD}decimal>`,
    ]);
    expect(quads).toHaveLength(6);
  });

  it('the same blank node maps to the same IRI', () => {
    const quads = rdfToQuads(
      '_:b <urn:p> "1" . _:b <urn:q> "2" .',
      'application/n-triples',
    );
    expect(new Set(quads.map((q) => q.subject)).size).toBe(1);
  });

  it('invalid Turtle and an empty document fail', () => {
    expect(() => rdfToQuads('<urn:a> <urn:b> .')).toThrow();
    expect(() => rdfToQuads('# nothing here\n')).toThrow(/produced no quads/);
  });
});
