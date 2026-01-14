import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { BlockchainConfig } from './blockchain-config.type';
import { isNumberString } from 'class-validator';

export function getConfig(): BlockchainConfig {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const consumerAddress = process.env.ORACLE_CONSUMER_ADDRESS;
  const subscriptionIdStr = process.env.CHAINLINK_SUBSCRIPTION_ID;
  const gasLimitStr = process.env.CHAINLINK_GAS_LIMIT || '300_000';
  const wsUrl = process.env.BLOCKCHAIN_WS_URL; // <-- new environment variable

  if (!rpcUrl) throw new Error('BLOCKCHAIN_RPC_URL is required');
  if (!wsUrl) throw new Error('BLOCKCHAIN_WS_URL is required'); // ensure WS URL exists
  if (!privateKey) throw new Error('BLOCKCHAIN_PRIVATE_KEY is required');
  if (!consumerAddress) throw new Error('ORACLE_CONSUMER_ADDRESS is required');
  if (!subscriptionIdStr || !isNumberString(subscriptionIdStr)) {
    throw new Error('CHAINLINK_SUBSCRIPTION_ID must be a valid number');
  }

  const subscriptionId = Number(subscriptionIdStr);
  const gasLimit = Number(gasLimitStr);

  if (gasLimit < 200000 || gasLimit > 5000000) {
    Logger.warn(
      `CHAINLINK_GAS_LIMIT=${gasLimit} is outside recommended range (200k–5M)`,
    );
  }

  return {
    rpcUrl,
    wsUrl,
    privateKey,
    consumerAddress,
    chainlink: {
      subscriptionId,
      gasLimit,
      donId: process.env.CHAINLINK_DON_ID, // optional
    },
  };
}

export default registerAs<BlockchainConfig>('blockchain', () => {
  Logger.log('Registering BlockchainConfig from environment variables');
  return getConfig();
});
