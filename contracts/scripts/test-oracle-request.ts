/*
import hre from 'hardhat';
import rawAbi from '../../artifacts/contracts/MfssiaOracleConsumer.sol/MfssiaOracleConsumer.json';
import { Contract, Signer } from 'ethers';

const { ethers, network } = hre;

// ---------- CONFIG ----------
const MAX_WAIT_MS = 3 * 60 * 1000; // 3 minutes
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const CALLBACK_GAS_LIMIT = 300_000;

// ---------- TYPES ----------
interface TestContext {
  signer: Signer;
  consumer: Contract;
  subscriptionId: number;
}

interface TestRequest {
  instanceKey: string;
  challengeSet:
    | 'mfssia:Example-A'
    | 'mfssia:Example-B'
    | 'mfssia:Example-C'
    | 'mfssia:Example-D';
  args: string[];
}

// ---------- ENTRY ----------
async function main() {
  assertNetwork();
  logHeader();

  const ctx = await loadContext();
  await logContractState(ctx);

  const request = buildTestRequest('A'); // Choose challenge set: 'A' | 'B' | 'C' | 'D'
  const requestId = await sendVerificationRequest(ctx, request);

  const response = await waitForOracleResponse(ctx.consumer, requestId);
  printOracleResult(response);

  console.log('\n✅ Test complete — oracle flow is healthy.');
}

// ---------- PHASE 0 ----------
function assertNetwork() {
  if (network.name !== 'sepolia') {
    console.warn(`⚠️ Intended for sepolia, running on ${network.name}`);
  }
}

function logHeader() {
  console.log(`\n🔍 Testing MfssiaOracleConsumer on ${network.name}\n`);
}

// ---------- PHASE 1 ----------
async function loadContext(): Promise<TestContext> {
  const contractAddress = process.env.ORACLE_CONSUMER_ADDRESS;
  const subscriptionId = Number(process.env.CHAINLINK_SUBSCRIPTION_ID);

  if (!contractAddress || !subscriptionId) {
    throw new Error(
      'Missing env config: ORACLE_CONSUMER_ADDRESS or CHAINLINK_SUBSCRIPTION_ID',
    );
  }

  const [signer] = await ethers.getSigners();
  const consumer = await ethers.getContractAt(
    rawAbi.abi,
    contractAddress,
    signer,
  );

  return { signer, consumer, subscriptionId };
}

async function logContractState(ctx: TestContext) {
  console.log('🔑 Signer:', await ctx.signer.getAddress());
  console.log('👑 Owner:', await ctx.consumer.owner());
  console.log('📦 Proxy Target:', await ctx.consumer.target);
  console.log('🌐 DON ID:', await ctx.consumer.donId());
  console.log(
    '🧠 JS verifier bytes:',
    (await ctx.consumer.batchVerificationLogic()).length,
  );
}

// ---------- PHASE 2 ----------
function buildTestRequest(set: 'A' | 'B' | 'C' | 'D'): TestRequest {
  const subjectDid = 'did:example:err-article-2026';
  const instanceId = '11111111-1111-1111-1111-111111111111';

  const instanceKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string'],
      [subjectDid, instanceId],
    ),
  );

  // Generate args per challenge set
  const args: string[] = buildArgsForSet(set);

  return {
    instanceKey,
    challengeSet: `mfssia:Example-${set}`,
    args,
  };
}

function buildArgsForSet(set: 'A' | 'B' | 'C' | 'D'): string[] {
  const evidences: Record<string, any> = {};
  let mandatory: string[] = [];
  let optional: string[] = [];

  switch (set) {
    case 'A':
      evidences['mfssia:C-A-1'] = { sourceDomainHash: 'err.ee' };
      evidences['mfssia:C-A-2'] = {
        content: 'test content',
        contentHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-A-3'] = {
        claimedPublishDate: '2025-12-15',
        serverTimestamp: '2025-12-16',
        archiveEarliestCaptureDate: '2025-12-14',
      };
      evidences['mfssia:C-A-4'] = {
        authorName: 'Jaan Tamm',
        authorEmailDomain: 'err.ee',
        affiliationRecordHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-A-5'] = {
        artifactSignature: 'sig'.padEnd(101, 'x'),
        merkleProof: Array(11).fill('proof'),
        signerPublicKeyId: 'did:key:123',
      };
      evidences['mfssia:C-A-6'] = { networkClusterScore: 0.38 };

      mandatory = [
        'mfssia:C-A-1',
        'mfssia:C-A-2',
        'mfssia:C-A-3',
        'mfssia:C-A-4',
        'mfssia:C-A-5',
        'mfssia:C-A-6',
      ];
      optional = [];
      break;

    case 'B':
      evidences['mfssia:C-B-1'] = { source: 'err.ee' };
      evidences['mfssia:C-B-2'] = {
        content: 'test',
        contentHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-B-3'] = {
        modelIds: { a: 1, b: 2 },
        softwareHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-B-4'] = {
        text: 'abc',
        spanToTextAlignment: [{ start: 0, end: 3, text: 'abc' }],
      };
      mandatory = [
        'mfssia:C-B-1',
        'mfssia:C-B-2',
        'mfssia:C-B-3',
        'mfssia:C-B-4',
      ];
      optional = [];
      break;

    case 'C':
      evidences['mfssia:C-C-1'] = { source: 'err.ee' };
      evidences['mfssia:C-C-2'] = {
        content: 'test',
        contentHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-C-3'] = {
        modelIdentifiers: { a: 1, b: 2, c: 3 },
        softwareHash: '0x'.padEnd(66, '0'),
      };
      mandatory = ['mfssia:C-C-1', 'mfssia:C-C-2', 'mfssia:C-C-3'];
      optional = [];
      break;

    case 'D':
      evidences['mfssia:C-D-1'] = { source: 'err.ee' };
      evidences['mfssia:C-D-2'] = {
        content: 'test',
        contentHash: '0x'.padEnd(66, '0'),
      };
      evidences['mfssia:C-D-3'] = {
        modelName: 'LLM',
        versionHash: '0x'.padEnd(66, '0'),
        softwareHash: '0x'.padEnd(66, '0'),
      };
      mandatory = ['mfssia:C-D-1', 'mfssia:C-D-2', 'mfssia:C-D-3'];
      optional = [];
      break;
  }

  return [
    JSON.stringify(evidences),
    JSON.stringify(mandatory),
    JSON.stringify(optional),
    'ALL_MANDATORY',
    '0.85',
    mandatory.length.toString(),
  ];
}

// ---------- PHASE 3 ----------
async function sendVerificationRequest(
  ctx: TestContext,
  req: TestRequest,
): Promise<string> {
  console.log('\n📨 Sending verification request');
  console.log('• instanceKey:', req.instanceKey);
  console.log('• challengeSet:', req.challengeSet);

  const tx = await ctx.consumer.requestVerification(
    req.instanceKey,
    req.challengeSet,
    req.args,
    ctx.subscriptionId,
    CALLBACK_GAS_LIMIT,
  );

  console.log('⏳ tx hash:', tx.hash);
  const receipt = await tx.wait();

  const log = receipt.logs.find((l: any) => {
    try {
      return (
        ctx.consumer.interface.parseLog(l).name === 'VerificationRequested'
      );
    } catch {
      return false;
    }
  });

  if (!log) throw new Error('VerificationRequested event not emitted');

  const { requestId } = ctx.consumer.interface.parseLog(log).args;
  console.log('🆔 requestId:', requestId);
  return requestId;
}

// ---------- PHASE 4 ----------
async function waitForOracleResponse(consumer: Contract, requestId: string) {
  console.log('\n⏱ Waiting for oracle response…');
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const events = await consumer.queryFilter(
      consumer.filters.VerificationResponseReceived(),
      -100,
    );

    const match: any = events.find(
      (e: any) => e.args.requestId.toLowerCase() === requestId.toLowerCase(),
    );
    if (match) return match.args;

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('Timeout waiting for oracle response');
}

// ---------- PHASE 5 ----------
function printOracleResult({ response, err }: any) {
  try {
    if (err?.length > 2) {
      console.error('❌ Oracle error:', ethers.toUtf8String(err));
      return;
    }

    const raw = ethers.toUtf8String(response);
    console.log('\n📥 Oracle raw response:\n', raw);

    try {
      console.log(
        '\n📊 Parsed response:',
        JSON.stringify(JSON.parse(raw), null, 2),
      );
    } catch {
      console.warn('⚠️ Response is not valid JSON');
    }
  } catch (e) {
    console.error('❌ Error decoding oracle response:', e);
  }
}

// ---------- UTILS ----------
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- RUN ----------
main().catch((e) => {
  console.error('\n❌ Test failed:', e);
  process.exitCode = 1;
});
*/
