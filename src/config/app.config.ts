import { ConfigFactory } from '@nestjs/config';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface AppConfig {
  nodeEnv: string;
  name?: string;
  port: number;
  apiPrefix: string;
  dkg: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    logLevel: string;    
    blockchain: {
      name: string;      
      gasPrice: string;
      transactionPollingTimeout: string; 
      publicKey: string;
      privateKey: string;    
      withgasPriceBufferPercent: number; 
    };
    maxNumberOfRetries: number;
    frequency: number;
    contentType: string;
    environment: string;
    //bidSuggestionRange: string;
    tokenAmount: string;
  };
  isDkgMocked: boolean;  
}

const parseNumber = (value: string | undefined, fallback = 0): number => {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
};

const appConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME,
  port: parseNumber(process.env.APP_PORT ?? process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  dkg: {
    endpoint: process.env.DKG_HOSTNAME,
    port: parseNumber(process.env.DKG_PORT, 8900),
    blockchain: {
      name: 'otp:20430',
      gasPrice: '100000',
      transactionPollingTimeout: '6000',
      publicKey: process.env.PUBLIC_KEY,
      privateKey: process.env.PRIVATE_KEY,
      withgasPriceBufferPercent: 1000
    },
    useSSL: false,
    logLevel: 'trace',
    maxNumberOfRetries: 1,
    frequency: 2,
    contentType: 'all',
    environment: 'testnet',
    //bidSuggestionRange: '500000000000000',
    tokenAmount: '5000000'
  },
  isDkgMocked: parseBool(process.env.IS_DKG_MOCKED, false)
};

const configFunction: ConfigFactory<AppConfig> = () => appConfig;

export default configFunction;
