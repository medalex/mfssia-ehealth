import { createHash } from 'crypto';

// Which knowledge asset (KA) a write goes to, and what a UAL is. This is the one place to change
// when writes should merge into or version an existing KA instead.
//
// Current policy: one KA per (@id, content). The name is the sanitized @id plus a short hash of
// the canonical content, so
// - publishing the same content again finds the existing KA and the write is skipped;
// - publishing changed content under the same @id creates a new KA next to the old one, as
//   dkg.js 8 did (it never overwrote). E.g. physician-registry publishes a new Merkle root
//   under the fixed @id urn:mfssia:physician-registry:v1.
// Content without an @id (raw RDF) is named by its hash alone.

const CONTENT_HASH_LENGTH = 12;
const MAX_ID_PART_LENGTH = 160;

export function contentHash(canonicalContent: string): string {
  return createHash('sha256')
    .update(canonicalContent)
    .digest('hex')
    .slice(0, CONTENT_HASH_LENGTH);
}

/** KA name: characters the node rejects in names (spaces, '/', '#', ...) become '-'. */
export function knowledgeAssetName(
  id: string | undefined,
  hash: string,
  prefixWithoutId = 'rdf',
): string {
  const idPart = (id ?? '')
    .replace(/[^A-Za-z0-9._~:-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_ID_PART_LENGTH);
  return `${idPart || prefixWithoutId}-${hash}`;
}

const UAL_PREFIX = 'did:dkg:context-graph:';

export function toUal(contextGraphId: string, name: string): string {
  return `${UAL_PREFIX}${contextGraphId}/${name}`;
}

/** Inverse of toUal; the name never holds '/', so the first '/' separates the two. */
export function parseUal(ual: string): {
  contextGraphId: string;
  name: string;
} {
  const rest = ual?.startsWith(UAL_PREFIX) ? ual.slice(UAL_PREFIX.length) : '';
  const slash = rest.indexOf('/');
  if (slash <= 0 || slash === rest.length - 1) {
    throw new Error(
      `Not a DKG V10 knowledge asset UAL: ${ual} (expected ${UAL_PREFIX}<context graph>/<name>)`,
    );
  }
  return { contextGraphId: rest.slice(0, slash), name: rest.slice(slash + 1) };
}
