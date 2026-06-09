import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { BlockchainConfig } from './blockchain-config.type';
import { isNumberString } from 'class-validator';

export function getConfig(): BlockchainConfig {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const consumerAddress = process.env.ORACLE_CONSUMER_ADDRESS;
  const subscriptionIdStr = process.env.CHAINLINK_SUBSCRIPTION_ID;
  const gasLimitStr = process.env.CHAINLINK_GAS_LIMIT || '300000';
  const wsUrl = process.env.BLOCKCHAIN_WS_URL;

  const missing = [
    !rpcUrl && 'BLOCKCHAIN_RPC_URL',
    !wsUrl && 'BLOCKCHAIN_WS_URL',
    !privateKey && 'BLOCKCHAIN_PRIVATE_KEY',
    !consumerAddress && 'ORACLE_CONSUMER_ADDRESS',
    (!subscriptionIdStr || !isNumberString(subscriptionIdStr)) && 'CHAINLINK_SUBSCRIPTION_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    Logger.warn(
      `BlockchainConfig: missing vars [${missing.join(', ')}] — oracle features disabled.`,
    );
    return {
      enabled: false,
      rpcUrl: undefined,
      wsUrl: undefined,
      privateKey: undefined,
      consumerAddress: undefined,
      chainlink: { subscriptionId: 0, gasLimit: 0, donId: undefined },
    };
  }

  const subscriptionId = Number(subscriptionIdStr);
  const gasLimit = Number(gasLimitStr);

  if (gasLimit < 200000 || gasLimit > 5000000) {
    Logger.warn(
      `CHAINLINK_GAS_LIMIT=${gasLimit} is outside recommended range (200k–5M)`,
    );
  }

  return {
    enabled: true,
    rpcUrl,
    wsUrl,
    privateKey,
    consumerAddress,
    chainlink: {
      subscriptionId,
      gasLimit,
      donId: process.env.CHAINLINK_DON_ID,
    },
  };
}

export default registerAs<BlockchainConfig>('blockchain', () => {
  Logger.log('Registering BlockchainConfig from environment variables');
  return getConfig();
});
