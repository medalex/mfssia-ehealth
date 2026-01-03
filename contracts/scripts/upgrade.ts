import { ethers, upgrades, network } from 'hardhat';

async function main() {
  const proxyAddress = process.env.ORACLE_CONSUMER_ADDRESS;
  const routerAddress = process.env.FUNCTIONS_ROUTER_ADDRESS;

  if (!proxyAddress || !routerAddress) {
    throw new Error(
      'Missing ORACLE_CONSUMER_ADDRESS or FUNCTIONS_ROUTER_ADDRESS',
    );
  }

  console.log(`Upgrading MfssiaOracleConsumer on ${network.name}`);

  const Factory = await ethers.getContractFactory('MfssiaOracleConsumer');

  const upgraded = await upgrades.upgradeProxy(proxyAddress, Factory, {
    kind: 'uups',
    constructorArgs: [routerAddress], // ✅ REQUIRED
    unsafeAllow: ['constructor', 'state-variable-immutable'],
  });

  await upgraded.waitForDeployment();

  console.log('Upgrade successful! 🎉');
  console.log('Proxy address (unchanged):', await upgraded.getAddress());
}

main().catch((error) => {
  console.error('Upgrade failed:', error);
  process.exitCode = 1;
});
