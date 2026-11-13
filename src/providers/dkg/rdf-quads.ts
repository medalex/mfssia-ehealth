import { randomUUID } from 'crypto';
import jsonld from 'jsonld';
import { Parser, Term } from 'n3';
import { DkgV10Quad } from './dkg-v10.client';
import SCHEMA_ORG_CONTEXT from './contexts/schema-org.jsonld.json';
import DID_V1_CONTEXT from './contexts/did-v1.jsonld.json';

// Converts what MFSSIA publishes into the quads a DKG V10 node takes: absolute IRIs as plain
// strings, literals in N-Triples form ("55"^^<http://www.w3.org/2001/XMLSchema#decimal>).
//
// Kept as dkg.js 8 did it, so the graph holds the same data after the migration:
// - JSON-LD is canonized with URDNA2015 in safe mode, so a term the context does not define
//   fails instead of being dropped;
// - blank nodes become `uuid:<random uuid>` IRIs;
// - the graph of a quad is dropped (the node puts the quads into the knowledge asset's graph).

// Remote contexts MFSSIA uses, served from local copies (fetched 2026-11-13) instead of the
// network; any other remote context is an error.
const LOCAL_CONTEXTS: Record<string, unknown> = {
  'https://schema.org': SCHEMA_ORG_CONTEXT,
  'https://schema.org/': SCHEMA_ORG_CONTEXT,
  'http://schema.org': SCHEMA_ORG_CONTEXT,
  'http://schema.org/': SCHEMA_ORG_CONTEXT,
  'https://schema.org/docs/jsonldcontext.jsonld': SCHEMA_ORG_CONTEXT,
  'https://w3id.org/did/v1': DID_V1_CONTEXT,
  'https://www.w3.org/ns/did/v1': DID_V1_CONTEXT,
};

export class MissingLocalContextError extends Error {
  constructor(readonly url: string) {
    super(
      `JSON-LD context ${url} is not available locally (remote contexts are not fetched)`,
    );
    this.name = 'MissingLocalContextError';
  }
}

export const localDocumentLoader = async (url: string) => {
  const document = LOCAL_CONTEXTS[url];
  if (!document) throw new MissingLocalContextError(url);
  return { contextUrl: null, documentUrl: url, document };
};

export type RdfFormat =
  | 'text/turtle'
  | 'application/n-triples'
  | 'application/n-quads'
  | 'application/trig';

/** JSON-LD document -> quads. */
export async function jsonLdToQuads(document: object): Promise<DkgV10Quad[]> {
  let nquads: string;
  try {
    nquads = await jsonld.canonize(
      document as jsonld.JsonLdDocument,
      {
        algorithm: 'URDNA2015',
        format: 'application/n-quads',
        safe: true,
        documentLoader: localDocumentLoader,
      } as jsonld.Options.Normalize,
    );
  } catch (error) {
    // jsonld wraps a loader failure in a generic "Dereferencing a URL ..." error; surface ours.
    const cause = (error as { details?: { cause?: unknown } })?.details?.cause;
    throw cause instanceof MissingLocalContextError ? cause : error;
  }
  const quads = parseRdf(nquads, 'application/n-quads');
  if (quads.length === 0) throw new Error('JSON-LD document produced no quads');
  return quads;
}

/** Turtle (or another RDF text format) -> quads. */
export function rdfToQuads(
  text: string,
  format: RdfFormat = 'text/turtle',
): DkgV10Quad[] {
  const quads = parseRdf(text, format);
  if (quads.length === 0)
    throw new Error(`${format} document produced no quads`);
  return quads;
}

function parseRdf(text: string, format: RdfFormat): DkgV10Quad[] {
  const blankNodeIris = new Map<string, string>();
  const toIri = (label: string) => {
    if (!blankNodeIris.has(label))
      blankNodeIris.set(label, `uuid:${randomUUID()}`);
    return blankNodeIris.get(label);
  };
  const toObject = (term: Term): string => {
    if (term.termType === 'NamedNode') return term.value;
    if (term.termType === 'BlankNode') return toIri(term.value);
    if (term.termType === 'Literal')
      return toNTriplesLiteral(term.value, term.language, term.datatype.value);
    throw new Error(`Unsupported RDF term type ${term.termType}`);
  };
  return new Parser({ format }).parse(text).map((quad) => ({
    subject: toObject(quad.subject),
    predicate: toObject(quad.predicate),
    object: toObject(quad.object),
  }));
}

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';

function toNTriplesLiteral(
  value: string,
  language: string,
  datatype: string,
): string {
  const quoted = `"${escapeLiteral(value)}"`;
  if (language) return `${quoted}@${language}`;
  if (!datatype || datatype === XSD_STRING || datatype === RDF_LANG_STRING)
    return quoted;
  return `${quoted}^^<${datatype}>`;
}

// N-Triples string escapes (ECHAR) for the characters that cannot appear raw in a literal.
function escapeLiteral(value: string): string {
  return value.replace(
    /[\\"\n\r\t\b\f]/g,
    (c) =>
      ({
        '\\': '\\\\',
        '"': '\\"',
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t',
        '\b': '\\b',
        '\f': '\\f',
      }[c]),
  );
}
