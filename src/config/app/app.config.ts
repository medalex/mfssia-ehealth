import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';
import { AppConfigValidator } from './app-config.validator';
import validateConfig from 'src/common/utils/validate-config';

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, AppConfigValidator);

  const port = parseInt(process.env.APP_PORT || '4000', 10);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'MFSSIA API',
    port,
    apiPrefix: process.env.API_PREFIX?.replace(/^\//, '') || 'api', // strip leading slash if present

    dkg: {
      endpoint: process.env.DKG_HOSTNAME || 'localhost',
      port: parseInt(process.env.DKG_PORT || '8900', 10),
      useSSL: false, // Can be made configurable if needed
      logLevel: 'trace',
      blockchain: {
        name: 'otp:20430',
        transactionPollingTimeout: 6000,
        publicKey: process.env.PUBLIC_KEY || '',
        privateKey: process.env.PRIVATE_KEY || '',
        withGasPriceBufferPercent: 150,
      },
      maxNumberOfRetries: 1,
      frequency: 2,
      contentType: 'all',
      environment: 'testnet',
    },

    isDkgMocked: process.env.IS_DKG_MOCKED === 'true',
  };
});
