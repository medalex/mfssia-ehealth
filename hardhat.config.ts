import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox'; // MUST be first — includes verify!
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, './.env') });

const required = ['BLOCKCHAIN_RPC_URL', 'BLOCKCHAIN_PRIVATE_KEY'] as const;
required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);
});

const config: HardhatUserConfig | any = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: { chainId: 31337 },
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL!,
      accounts: [process.env.BLOCKCHAIN_PRIVATE_KEY!],
      chainId: 11155111,
    },
  },
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  mocha: { timeout: 100000 },
};

export default config;
