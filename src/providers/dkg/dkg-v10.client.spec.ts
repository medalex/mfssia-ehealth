// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { DkgV10Client, DkgV10Error } from './dkg-v10.client';

const TOKEN = 'secret-token-123';
const BASE_URL = 'http://dkg.test:9200/';

type Reply = { status: number; data: unknown } | { code: string };

// Stands in for the HTTP transport: records each request and answers with the next reply.
const fakeNode = (...replies: Reply[]) => {
  const requests: InternalAxiosRequestConfig[] = [];
  const adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    requests.push(config);
    const reply = replies.shift() ?? { status: 200, data: {} };
    if ('code' in reply)
      throw new AxiosError(`network: ${reply.code}`, reply.code, config);
    const response = {
      data: reply.data,
      status: reply.status,
      statusText: `status ${reply.status}`,
      headers: {},
      config,
    };
    if (reply.status >= 400)
      throw new AxiosError(
        `Request failed with status code ${reply.status}`,
        'ERR_BAD_RESPONSE',
        config,
        null,
        response,
      );
    return response;
  };
  const client = new DkgV10Client({
    baseUrl: BASE_URL,
    token: TOKEN,
    timeoutMs: 1234,
    adapter,
  });
  return { client, requests };
};

const body = (config: InternalAxiosRequestConfig) =>
  JSON.parse(config.data as string);

const failure = async (call: Promise<unknown>): Promise<DkgV10Error> => {
  try {
    await call;
  } catch (error) {
    expect(error).toBeInstanceOf(DkgV10Error);
    return error as DkgV10Error;
  }
  throw new Error('expected the call to fail');
};

describe('DkgV10Client — requests', () => {
  it('sends the bearer token, base URL and timeout on every request', async () => {
    const { client, requests } = fakeNode({
      status: 200,
      data: { version: '10.0.27' },
    });

    expect(await client.getStatus()).toEqual({ version: '10.0.27' });

    const [request] = requests;
    expect([request.method, request.baseURL, request.url]).toEqual([
      'get',
      'http://dkg.test:9200',
      '/api/status',
    ]);
    expect(request.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(request.timeout).toBe(1234);
  });

  it('creates a context graph', async () => {
    const { client, requests } = fakeNode({
      status: 200,
      data: { created: 'mfssia-ehealth' },
    });

    await client.createContextGraph('mfssia-ehealth', 'MFSSIA eHealth', 'demo');

    expect([requests[0].method, requests[0].url]).toEqual([
      'post',
      '/api/context-graph/create',
    ]);
    expect(body(requests[0])).toEqual({
      id: 'mfssia-ehealth',
      name: 'MFSSIA eHealth',
      description: 'demo',
    });
  });

  it('creates a knowledge asset as an unsealed Working Memory draft', async () => {
    const { client, requests } = fakeNode({
      status: 200,
      data: { name: 'lab-1' },
    });
    const quads = [
      {
        subject: 'urn:lab:1',
        predicate: 'https://mfssia.io/rx#value',
        object: '"55"^^<http://www.w3.org/2001/XMLSchema#decimal>',
      },
    ];

    await client.createKnowledgeAsset('mfssia-ehealth', 'lab-1', quads);

    expect([requests[0].method, requests[0].url]).toEqual([
      'post',
      '/api/knowledge-assets',
    ]);
    expect(body(requests[0])).toEqual({
      contextGraphId: 'mfssia-ehealth',
      name: 'lab-1',
      quads,
      finalize: false,
    });
  });

  it('reads a knowledge asset by name, escaping the name in the path', async () => {
    const { client, requests } = fakeNode({
      status: 200,
      data: { name: 'a/b c' },
    });

    await client.getKnowledgeAsset('mfssia-ehealth', 'a/b c');

    expect([requests[0].method, requests[0].url]).toEqual([
      'get',
      '/api/knowledge-assets/a%2Fb%20c',
    ]);
    expect(requests[0].params).toEqual({ contextGraphId: 'mfssia-ehealth' });
  });

  it('queries Working Memory and returns the binding rows', async () => {
    const rows = [
      {
        value: '"55"^^<http://www.w3.org/2001/XMLSchema#decimal>',
        src: 'urn:org:lab-a',
      },
    ];
    const { client, requests } = fakeNode({
      status: 200,
      data: { result: { type: 'bindings', bindings: rows } },
    });

    expect(
      await client.query('mfssia-ehealth', 'SELECT * WHERE { ?s ?p ?o }'),
    ).toEqual(rows);
    expect([requests[0].method, requests[0].url]).toEqual([
      'post',
      '/api/query',
    ]);
    expect(body(requests[0])).toEqual({
      sparql: 'SELECT * WHERE { ?s ?p ?o }',
      contextGraphId: 'mfssia-ehealth',
      view: 'working-memory',
    });
  });

  it('rejects a query response without bindings instead of returning nothing', async () => {
    const { client } = fakeNode({
      status: 200,
      data: { result: { type: 'quads', quads: [] } },
    });

    const error = await failure(
      client.query('mfssia-ehealth', 'CONSTRUCT WHERE { ?s ?p ?o }'),
    );

    expect(error.message).toMatch(/no result\.bindings/);
  });

  it('requires a base URL and a token', () => {
    expect(() => new DkgV10Client({ baseUrl: '', token: TOKEN })).toThrow(
      /base URL/,
    );
    expect(() => new DkgV10Client({ baseUrl: BASE_URL, token: '' })).toThrow(
      /token/,
    );
  });
});

describe('DkgV10Client — errors', () => {
  it.each([
    [
      401,
      { error: 'Unauthorized' },
      /POST \/api\/query failed: HTTP 401: Unauthorized/,
    ],
    [
      404,
      { error: 'Context graph not found' },
      /HTTP 404: Context graph not found/,
    ],
    [500, { message: 'store unavailable' }, /HTTP 500: store unavailable/],
    [503, '', /HTTP 503: status 503/],
  ])(
    'HTTP %i becomes a DkgV10Error with the status and the node message',
    async (status, data, message) => {
      const { client } = fakeNode({ status, data });

      const error = await failure(
        client.query('mfssia-ehealth', 'SELECT * WHERE { ?s ?p ?o }'),
      );

      expect(error.message).toMatch(message);
      expect([error.status, error.endpoint]).toEqual([
        status,
        'POST /api/query',
      ]);
    },
  );

  it('a timeout names the endpoint and the time limit', async () => {
    const { client } = fakeNode({ code: 'ECONNABORTED' });

    const error = await failure(client.getStatus());

    expect(error.message).toBe(
      'DKG V10 GET /api/status timed out (1234 ms) at http://dkg.test:9200',
    );
  });

  it('an unreachable node names the URL', async () => {
    const { client } = fakeNode({ code: 'ECONNREFUSED' });

    const error = await failure(client.createContextGraph('cg', 'cg', ''));

    expect(error.message).toBe(
      'DKG V10 node unreachable at http://dkg.test:9200 (POST /api/context-graph/create): ECONNREFUSED',
    );
  });

  it('never exposes the token', async () => {
    const { client } = fakeNode(
      { status: 401, data: { error: 'Unauthorized' } },
      { code: 'ECONNREFUSED' },
    );

    for (const call of [client.getStatus(), client.getStatus()]) {
      const error = await failure(call);
      expect(
        JSON.stringify({
          ...error,
          message: error.message,
          stack: error.stack,
        }),
      ).not.toContain(TOKEN);
      expect(error.cause).toBeUndefined();
    }
  });
});
