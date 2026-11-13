// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { DkgService } from './dkg.service';
import { DkgV10Error, DkgV10Quad } from './dkg-v10.client';

const CG = 'mfssia-ehealth';

// Behaves like a V10 node: 409 for an existing context graph, 404 for a missing knowledge asset.
const fakeNode = () => {
  const graphs = new Set<string>();
  const assets = new Map<string, DkgV10Quad[]>();
  const calls: string[] = [];
  let createGraphFailures = 0;
  const client = {
    failNextGraphCreate: () => {
      createGraphFailures++;
    },
    getStatus: async () => ({ version: '10.0.27', networkName: 'test' }),
    createContextGraph: async (id: string) => {
      calls.push(`createContextGraph ${id}`);
      if (createGraphFailures > 0) {
        createGraphFailures--;
        throw new DkgV10Error('node down', 'POST /api/context-graph/create');
      }
      if (graphs.has(id))
        throw new DkgV10Error('exists', 'POST /api/context-graph/create', 409);
      graphs.add(id);
      return { created: id };
    },
    getKnowledgeAsset: async (cg: string, name: string) => {
      if (!assets.has(`${cg}/${name}`))
        throw new DkgV10Error('missing', 'GET', 404);
      return { name, assertionGraph: `graph:${name}`, status: 'draft-open' };
    },
    getKnowledgeAssetQuads: async (cg: string, name: string) =>
      assets.get(`${cg}/${name}`) ?? [],
    createKnowledgeAsset: async (
      cg: string,
      name: string,
      quads: DkgV10Quad[],
    ) => {
      calls.push(`createKnowledgeAsset ${name}`);
      assets.set(`${cg}/${name}`, quads);
      return {
        name,
        assertionUri: `graph:${name}`,
        status: 'draft-open',
        alreadyExists: false,
      };
    },
    query: async (cg: string, sparql: string) => {
      calls.push(`query ${cg}`);
      return [{ s: 'urn:x', sparqlLength: String(sparql.length) }];
    },
  };
  return { client, calls, assets, graphs };
};

const makeService = (dkg: Record<string, unknown> = {}) => {
  const config = {
    get: () => ({
      url: 'http://dkg.test:9200',
      token: 't',
      contextGraph: CG,
      writeMode: 'draft',
      ...dkg,
    }),
  } as any;
  const service = new DkgService(config);
  const node = fakeNode();
  (service as any).client = node.client;
  return { service, ...node };
};

const labResult = (value: string) =>
  ({
    '@context': {
      rx: 'https://mfssia.io/ontology/prescription#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
    '@id': 'urn:lab-result:pilot-P1-lab-b-egfr',
    '@type': 'rx:LabResult',
    'rx:hasValue': { '@value': value, '@type': 'xsd:decimal' },
  } as any);

describe('DkgService on DKG V10 — writes', () => {
  it('createAsset writes one KA named after the @id and returns a context-graph UAL', async () => {
    const { service, calls, assets } = makeService();

    const response = await service.createAsset(labResult('20'));

    expect(response.UAL).toMatch(
      /^did:dkg:context-graph:mfssia-ehealth\/urn:lab-result:pilot-P1-lab-b-egfr-[0-9a-f]{12}$/,
    );
    expect(calls).toEqual([
      'createContextGraph mfssia-ehealth',
      expect.stringMatching(/^createKnowledgeAsset urn:lab-result/),
    ]);
    const [quads] = [...assets.values()];
    expect(quads).toContainEqual({
      subject: 'urn:lab-result:pilot-P1-lab-b-egfr',
      predicate: 'https://mfssia.io/ontology/prescription#hasValue',
      object: '"20"^^<http://www.w3.org/2001/XMLSchema#decimal>',
    });
  });

  it('the same content again is skipped and gets the same UAL', async () => {
    const { service, calls } = makeService();

    const first = await service.createAsset(labResult('20'));
    const second = await service.createAsset(labResult('20'));

    expect(second.UAL).toBe(first.UAL);
    expect(second.operation.status).toBe('SKIPPED');
    expect(
      calls.filter((c) => c.startsWith('createKnowledgeAsset')),
    ).toHaveLength(1);
  });

  it('changed content under the same @id becomes a new KA next to the old one', async () => {
    const { service, assets } = makeService();

    const first = await service.createAsset(labResult('20'));
    const second = await service.createAsset(labResult('25'));

    expect(second.UAL).not.toBe(first.UAL);
    expect(assets.size).toBe(2);
  });

  it('an existing context graph (409) is fine, and a failed creation is retried on the next call', async () => {
    const { service, client, calls, graphs } = makeService();
    graphs.add(CG);
    client.failNextGraphCreate();

    await expect(
      service.findAssets('SELECT * WHERE { ?s ?p ?o }'),
    ).rejects.toThrow(/node down/);
    await service.findAssets('SELECT * WHERE { ?s ?p ?o }');
    await service.findAssets('SELECT * WHERE { ?s ?p ?o }');

    expect(
      calls.filter((c) => c.startsWith('createContextGraph')),
    ).toHaveLength(2);
  });

  it('publishRdf parses Turtle, names the KA by its hash, rejects bad input as BadRequest', async () => {
    const { service } = makeService();
    const turtle =
      '@prefix rx: <https://mfssia.io/ontology/prescription#> . <urn:p:1> a rx:Policy .';

    expect(
      (await service.publishRdf(turtle, 'text/turtle; charset=utf-8')).UAL,
    ).toMatch(/\/rdf-[0-9a-f]{12}$/);
    await expect(
      service.publishRdf(turtle, 'application/ld+json'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.publishRdf('<urn:a> <urn:b> .   ', 'text/turtle'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.publishRdf('', 'text/turtle')).rejects.toThrow(
      /Empty RDF payload/,
    );
  });

  it('publishAttestation writes the enriched attestation and returns its UAL', async () => {
    const { service, assets } = makeService();

    const ual = await service.publishAttestation(
      { '@id': 'urn:mfssia:attestation:x', identity: 'did:example:1' },
      '0xreq',
      'inst-1',
    );

    expect(ual).toMatch(
      /^did:dkg:context-graph:mfssia-ehealth\/urn:mfssia:attestation:x-[0-9a-f]{12}$/,
    );
    expect(assets.size).toBe(1);
  });
});

describe('DkgService on DKG V10 — reads', () => {
  it('findAssets and queryAttestations return { data: rows } from the context graph', async () => {
    const { service, calls } = makeService();

    const found = await service.findAssets('SELECT ?s WHERE { ?s ?p ?o }');
    const attestations = await service.queryAttestations('did:example:1');

    expect(found).toEqual({ data: [expect.objectContaining({ s: 'urn:x' })] });
    expect(attestations).toEqual({
      data: [expect.objectContaining({ s: 'urn:x' })],
    });
    expect(calls.filter((c) => c.startsWith('query'))).toEqual([
      `query ${CG}`,
      `query ${CG}`,
    ]);
  });

  it('readAsset returns the KA state and its quads', async () => {
    const { service } = makeService();
    const { UAL } = await service.createAsset(labResult('20'));

    const asset = (await service.readAsset(UAL)) as any;

    expect(asset.UAL).toBe(UAL);
    expect(asset.status).toBe('draft-open');
    expect(asset.assertion).toContainEqual(
      expect.objectContaining({
        object: '"20"^^<http://www.w3.org/2001/XMLSchema#decimal>',
      }),
    );
    await expect(
      service.readAsset('did:dkg:hardhat1:31337/0xabc/1'),
    ).rejects.toThrow(/Not a DKG V10 knowledge asset UAL/);
  });

  it('getDkgNodeInfo returns the node status', async () => {
    const { service } = makeService();
    expect(await service.getDkgNodeInfo()).toEqual(
      expect.objectContaining({ version: '10.0.27' }),
    );
  });
});

describe('DkgService on DKG V10 — configuration', () => {
  it('refuses publish mode until it is implemented', () => {
    expect(() => makeService({ writeMode: 'publish' })).toThrow(
      /DKG_WRITE_MODE=publish is not supported yet/,
    );
  });

  it('requires a token', () => {
    expect(() => makeService({ token: '' })).toThrow(/token is not set/);
  });
});
