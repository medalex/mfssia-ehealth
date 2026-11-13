// Globals imported explicitly: this repo has no @types/jest and tsconfig pins
// "types": ["node"], so the ambient declarations are not in scope.
import { describe, it, expect } from '@jest/globals';
import {
  contentHash,
  knowledgeAssetName,
  parseUal,
  toUal,
} from './knowledge-asset-naming';

describe('knowledge-asset-naming', () => {
  it('content hash is short, stable and content-sensitive', () => {
    expect(contentHash('a')).toMatch(/^[0-9a-f]{12}$/);
    expect(contentHash('a')).toBe(contentHash('a'));
    expect(contentHash('a')).not.toBe(contentHash('b'));
  });

  it('name keeps the @id readable and replaces characters the node rejects', () => {
    expect(
      knowledgeAssetName('urn:lab-result:pilot-P1-lab-b-egfr', 'abc'),
    ).toBe('urn:lab-result:pilot-P1-lab-b-egfr-abc');
    expect(knowledgeAssetName('https://example.org/a b#c', 'abc')).toBe(
      'https:-example.org-a-b-c-abc',
    );
    expect(knowledgeAssetName('x'.repeat(500), 'abc')).toHaveLength(160 + 4);
  });

  it('content without an @id is named by its hash', () => {
    expect(knowledgeAssetName(undefined, 'abc')).toBe('rdf-abc');
    expect(knowledgeAssetName('', 'abc', 'attestation')).toBe(
      'attestation-abc',
    );
  });

  it('UAL round-trips and rejects anything else', () => {
    const ual = toUal('mfssia-ehealth', 'urn:consent:1-abc');
    expect(ual).toBe('did:dkg:context-graph:mfssia-ehealth/urn:consent:1-abc');
    expect(parseUal(ual)).toEqual({
      contextGraphId: 'mfssia-ehealth',
      name: 'urn:consent:1-abc',
    });
    expect(() => parseUal('did:dkg:hardhat1:31337/0xabc/1')).toThrow(
      /Not a DKG V10 knowledge asset UAL/,
    );
    expect(() => parseUal('did:dkg:context-graph:mfssia-ehealth/')).toThrow();
  });
});
