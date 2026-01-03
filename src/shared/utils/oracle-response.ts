// ----------------------- UTILS -----------------------

// Map challenge index to challenge ID
const CHALLENGE_INDEX: Record<string, number> = {
  'mfssia:C-A-1': 0,
  'mfssia:C-A-2': 1,
  'mfssia:C-A-3': 2,
  'mfssia:C-A-4': 3,
  'mfssia:C-A-5': 4,
  'mfssia:C-A-6': 5,
  'mfssia:C-B-1': 6,
  'mfssia:C-B-2': 7,
  'mfssia:C-B-3': 8,
  'mfssia:C-B-4': 9,
  'mfssia:C-B-5': 10,
  'mfssia:C-B-6': 11,
  'mfssia:C-B-7': 12,
  'mfssia:C-B-8': 13,
  'mfssia:C-B-9': 14,
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

/**
 * Decode oracle bitmask into readable challenge results
 * @param bitmaskHex 64-byte hex string from oracle response (`m`)
 * @returns array of challenge IDs that passed
 */
export function decodeChallengeBitmask(bitmaskHex: string): string[] {
  if (!bitmaskHex.startsWith('0x')) {
    throw new Error(`Invalid bitmask format: ${bitmaskHex}`);
  }

  const mask = BigInt(bitmaskHex); // convert hex to bigint
  const passedChallenges: string[] = [];

  for (const [challengeId, index] of Object.entries(CHALLENGE_INDEX)) {
    // Check if the bit at position `index` is set
    if ((mask & (1n << BigInt(index))) !== 0n) {
      passedChallenges.push(challengeId);
    }
  }

  return passedChallenges;
}

/**
 * Convert oracle response to structured format
 * @param response Oracle response object (parsed JSON)
 */
export function parseOracleResponse(response: any) {
  const passedChallenges = decodeChallengeBitmask(response.m);
  const aggregateConfidence = (response.c ?? 0) / 10000; // convert to 0-1
  const finalResult = response.r === 1 ? 'PASS' : 'FAIL';

  return { passedChallenges, aggregateConfidence, finalResult };
}
