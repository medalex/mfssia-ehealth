export type AppConfig = {
  nodeEnv: string;
  name: string;
  port: number;
  apiPrefix: string;

  dkg: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    logLevel: string;
    blockchain: {
      name: string;
      transactionPollingTimeout: number;
      publicKey: string;
      privateKey: string;
      withGasPriceBufferPercent: number;
    };
    maxNumberOfRetries: number;
    frequency: number;
    contentType: string;
    environment: string;
  };

  isDkgMocked: boolean;
};
