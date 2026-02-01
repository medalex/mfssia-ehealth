import { AppConfig } from './app/app-config.type';
import { BlockchainConfig } from './blockchain/blockchain-config.type';
import { DatabaseConfig } from './database/database-config.type';
import { ChallengesConfig } from './challenges/challenges-config.type';

export type GlobalConfig = {
  app: AppConfig;
  database: DatabaseConfig;
  blockchain: BlockchainConfig;
  challenges: ChallengesConfig;
};
