// import { ethers, upgrades, network } from 'hardhat';
// import * as fs from 'fs/promises';
// import * as path from 'path';

// async function main() {
//   console.log(`Deploying MfssiaOracleConsumer on ${network.name}`);

//   const routerAddress = process.env.FUNCTIONS_ROUTER_ADDRESS;
//   const donIdString = process.env.CHAINLINK_DON_ID;

//   if (!routerAddress || !donIdString) {
//     throw new Error('Missing FUNCTIONS_ROUTER_ADDRESS or CHAINLINK_DON_ID');
//   }

//   const donIdBytes32 = ethers.encodeBytes32String(donIdString);

//   const scriptPath = path.resolve(
//     __dirname,
//     '../functions/mfssia-batch-verification.js',
//   );
//   const verificationScript = await fs.readFile(scriptPath, 'utf8');
//   console.log(`Loaded script: ${verificationScript.length} characters`);

//   const Factory = await ethers.getContractFactory('MfssiaOracleConsumer');

//   // Pass constructor arg (router) AND initializer args (donId, script)
//   const consumer = await upgrades.deployProxy(
//     Factory,
//     [donIdBytes32, verificationScript], // ← These go to initialize()
//     {
//       constructorArgs: [routerAddress], // ← Router goes to constructor
//       kind: 'uups',
//       unsafeAllow: ['constructor', 'state-variable-immutable'], // Required for FunctionsClient
//     },
//   );

//   await consumer.waitForDeployment();
//   const address = await consumer.getAddress();

//   console.log(`MfssiaOracleConsumer deployed at: ${address}`);
//   console.log('Initialization complete (called via proxy deployment)');

//   console.log('\nDeployment successful! 🎉');
//   console.log(`Contract address: ${address}`);
//   console.log(`Set ORACLE_CONSUMER_ADDRESS=${address} in backend .env`);
// }

// main().catch((error) => {
//   console.error('Deployment failed:', error);
//   process.exitCode = 1;
// });
