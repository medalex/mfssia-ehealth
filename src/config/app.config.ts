import { ConfigFactory } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/./../../.env' });

export const appConfig: any = {
  nodeEnv: process.env.NODE_ENV,
  name: process.env.APP_NAME,
  port: parseInt(process.env.APP_PORT || process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  dkg: {
    hostname: 'http://18.156.197.138',
    port: 8900,
    dataProviderWallet: '0x80e705be5475563f7ac941dc8b99b9251b3bba4f',
  },
  wallet: {
    publicKey: process.env.PUBLIC_KEY,
    privateKey: process.env.PRIVATE_KEY,
  },
};

const configFunction: ConfigFactory<any> = () => appConfig;
export default configFunction;
