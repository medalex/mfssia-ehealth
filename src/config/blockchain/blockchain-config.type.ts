import { ChainlinkFunctionsOptions } from './chainlink-functions-options.type';

export type BlockchainConfig = {
  enabled: boolean;
  rpcUrl: string | undefined;
  wsUrl: string | undefined;
  privateKey: string | undefined;
  consumerAddress: string | undefined;
  chainlink: ChainlinkFunctionsOptions;
};
