import axios, { AxiosAdapter, AxiosInstance, AxiosRequestConfig } from 'axios';

// Thin HTTP client for an OriginTrail DKG V10 node (API on port 9200, "Authorization: Bearer <token>").
// Covers only what MFSSIA needs: status, context graph creation, Working Memory knowledge assets
// and SPARQL over Working Memory. Every failure becomes a DkgV10Error that names the endpoint and
// never carries the token.

/** One RDF quad as the node takes it: absolute IRIs, literals in N-Triples form ("55"^^<xsd:decimal>). */
export interface DkgV10Quad {
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
}

/** One SPARQL result row: variable name -> IRI or N-Triples literal. */
export type DkgV10BindingRow = Record<string, string>;

export interface DkgV10ClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  /** Replaces the HTTP transport; for tests. */
  adapter?: AxiosAdapter;
}

export class DkgV10Error extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'DkgV10Error';
  }
}

export const DKG_V10_DEFAULT_TIMEOUT_MS = 30_000;

export class DkgV10Client {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(options: DkgV10ClientOptions) {
    if (!options.baseUrl) throw new Error('DKG V10 base URL is not set');
    if (!options.token) throw new Error('DKG V10 token is not set');
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeoutMs ?? DKG_V10_DEFAULT_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${options.token}` },
      adapter: options.adapter,
    });
  }

  getStatus(): Promise<Record<string, unknown>> {
    return this.request({ method: 'GET', url: '/api/status' });
  }

  createContextGraph(
    id: string,
    name: string,
    description: string,
  ): Promise<Record<string, unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/context-graph/create',
      data: { id, name, description },
    });
  }

  /** Creates the KA and writes the quads to an unsealed Working Memory draft (no chain involved). */
  createKnowledgeAsset(
    contextGraphId: string,
    name: string,
    quads: DkgV10Quad[],
  ): Promise<Record<string, unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/knowledge-assets',
      data: { contextGraphId, name, quads, finalize: false },
    });
  }

  getKnowledgeAsset(
    contextGraphId: string,
    name: string,
  ): Promise<Record<string, unknown>> {
    return this.request({
      method: 'GET',
      url: `/api/knowledge-assets/${encodeURIComponent(name)}`,
      params: { contextGraphId },
    });
  }

  /** SPARQL SELECT over the context graph's Working Memory; returns the binding rows. */
  async query(
    contextGraphId: string,
    sparql: string,
  ): Promise<DkgV10BindingRow[]> {
    const body = await this.request<{
      result?: { bindings?: DkgV10BindingRow[] };
    }>({
      method: 'POST',
      url: '/api/query',
      data: { sparql, contextGraphId, view: 'working-memory' },
    });
    const bindings = body?.result?.bindings;
    if (!Array.isArray(bindings)) {
      throw new DkgV10Error(
        'DKG V10 POST /api/query: response has no result.bindings',
        'POST /api/query',
        200,
        body,
      );
    }
    return bindings;
  }

  private async request<T = Record<string, unknown>>(
    config: AxiosRequestConfig,
  ): Promise<T> {
    const endpoint = `${config.method} ${config.url}`;
    try {
      const response = await this.http.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.toDkgV10Error(endpoint, error);
    }
  }

  // Built from status, body and error code only: the axios error itself holds the request
  // headers (with the token), so it is neither included nor attached as the cause.
  private toDkgV10Error(endpoint: string, error: unknown): DkgV10Error {
    if (!axios.isAxiosError(error)) {
      return new DkgV10Error(
        `DKG V10 ${endpoint} failed: ${String(
          (error as Error)?.message ?? error,
        )}`,
        endpoint,
      );
    }
    if (error.response) {
      const { status, statusText, data } = error.response;
      const detail =
        (data as { error?: unknown; message?: unknown })?.error ??
        (data as { message?: unknown })?.message ??
        statusText;
      return new DkgV10Error(
        `DKG V10 ${endpoint} failed: HTTP ${status}: ${String(detail)}`,
        endpoint,
        status,
        data,
      );
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new DkgV10Error(
        `DKG V10 ${endpoint} timed out (${this.http.defaults.timeout} ms) at ${this.baseUrl}`,
        endpoint,
      );
    }
    return new DkgV10Error(
      `DKG V10 node unreachable at ${this.baseUrl} (${endpoint}): ${
        error.code ?? error.message
      }`,
      endpoint,
    );
  }
}
