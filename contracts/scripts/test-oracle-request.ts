import hre from 'hardhat';
import rawAbi from '../../artifacts/contracts/MfssiaOracleConsumer.sol/MfssiaOracleConsumer.json';

const { ethers, network } = hre;

// ---------- CONFIG ----------
const MAX_WAIT_MS = 3 * 60 * 1000;
const POLL_INTERVAL_MS = 10_000;
const CALLBACK_GAS_LIMIT = 300_000;

// ---------- ENTRY ----------
async function main() {
  assertNetwork();
  logHeader();

  const ctx = await loadContext();
  await logContractState(ctx);

  const request = buildTestRequest();
  const requestId = await sendVerificationRequest(ctx, request);

  const response = await waitForOracleResponse(ctx.consumer, requestId);

  printOracleResult(response);

  console.log('\n✅ Test complete — oracle flow is healthy.');
}

// ---------- PHASE 0 ----------
function assertNetwork() {
  if (network.name !== 'sepolia') {
    console.warn(`⚠️  Intended for sepolia, running on ${network.name}`);
  }
}

function logHeader() {
  console.log(`\n🔍 Testing MfssiaOracleConsumer on ${network.name}\n`);
}

// ---------- PHASE 1 ----------
async function loadContext() {
  const contractAddress = process.env.ORACLE_CONSUMER_ADDRESS;
  const subscriptionId = Number(process.env.CHAINLINK_SUBSCRIPTION_ID);

  if (!contractAddress || !subscriptionId) {
    throw new Error('Missing env config (contract / subscription)');
  }

  const [signer] = await ethers.getSigners();
  const consumer = await ethers.getContractAt(
    rawAbi.abi,
    contractAddress,
    signer,
  );

  return { signer, consumer, subscriptionId };
}

async function logContractState(ctx: any) {
  console.log('🔑 Signer:', ctx.signer.address);
  console.log('👑 Owner:', await ctx.consumer.owner());
  console.log('📦 Proxy:', ctx.consumer.target);
  console.log('🌐 DON:', await ctx.consumer.donId());
  console.log(
    '🧠 JS bytes:',
    (await ctx.consumer.batchVerificationLogic()).length,
  );
}

// ---------- PHASE 2 ----------
function buildTestRequest() {
  const subjectDid = 'did:example:err-article-2026';
  const instanceId = '11111111-1111-1111-1111-111111111111';

  const instanceKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string'],
      [subjectDid, instanceId],
    ),
  );

  const args = buildExampleAArgs();

  return {
    instanceKey,
    challengeSet: 'mfssia:Example-A',
    args,
  };
}

function buildExampleAArgs(): string[] {
  return [
    JSON.stringify({
      'mfssia:C-A-1': { sourceDomainHash: 'err.ee' },
      'mfssia:C-A-2': {
        similarityScore: 0.32,
      },
      'mfssia:C-A-3': {
        claimedPublishDate: '2025-12-15',
      },
      'mfssia:C-A-4': {
        authorName: 'Jaan Tamm',
      },
      'mfssia:C-A-6': {
        networkClusterScore: 0.38,
      },
      'mfssia:C-A-7': { ok: true },
    }),
    JSON.stringify([
      'mfssia:C-A-1',
      'mfssia:C-A-2',
      'mfssia:C-A-3',
      'mfssia:C-A-4',
      'mfssia:C-A-6',
      'mfssia:C-A-7',
    ]),
    JSON.stringify(['mfssia:C-A-5']),
    'ALL_MANDATORY',
    'null',
    '6',
  ];
}

// ---------- PHASE 3 ----------
async function sendVerificationRequest(ctx: any, req: any): Promise<string> {
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

  console.log('⏳ tx:', tx.hash);
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

  if (!log) throw new Error('VerificationRequested not emitted');

  const { requestId } = ctx.consumer.interface.parseLog(log).args;

  console.log('🆔 requestId:', requestId);
  return requestId;
}

// ---------- PHASE 4 ----------
async function waitForOracleResponse(consumer: any, requestId: string) {
  console.log('\n⏱ Waiting for oracle response…');

  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const events = await consumer.queryFilter(
      consumer.filters.VerificationResponseReceived(),
      -100,
    );

    const match = events.find(
      (e: any) => e.args.requestId.toLowerCase() === requestId.toLowerCase(),
    );

    if (match) return match.args;

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('Timeout waiting for oracle response');
}

// ---------- PHASE 5 ----------
function printOracleResult({ response, err }: any) {
  if (err?.length > 2) {
    console.log('❌ Oracle error:', ethers.toUtf8String(err));
    return;
  }

  const raw = ethers.toUtf8String(response);
  console.log('\n📥 Oracle raw response:\n', raw);

  try {
    console.log('\n📊 Parsed:', JSON.stringify(JSON.parse(raw), null, 2));
  } catch {
    console.log('⚠️ Response is not JSON');
  }
}

// ---------- UTILS ----------
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- RUN ----------
main().catch((e) => {
  console.error('\n❌ Test failed:', e);
  process.exitCode = 1;
});
