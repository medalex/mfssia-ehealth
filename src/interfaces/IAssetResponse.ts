export interface IAssetResponse {
  UAL: string;
  assertionId: string;
  operation: {
    operationId: string;
    status: string;
  };
}

export interface IBlockchain {
  name: string;
  publicKey: string;
  privateKey: string;
  hubContract: string;
  rpc: string;
  gasPrice: string;
  transactionPollingTimeout: string;
}
