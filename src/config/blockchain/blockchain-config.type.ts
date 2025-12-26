import { ChainlinkFunctionsOptions } from './chainlink-functions-options.type';

export type BlockchainConfig = {
  rpcUrl: string;
  privateKey: string;
  consumerAddress: string;
  chainlink: ChainlinkFunctionsOptions;
};
