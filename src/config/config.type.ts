import { AppConfig } from './app/app-config.type';
import { DatabaseConfig } from './database/database-config.type';

export type GlobalConfig = {
  app: AppConfig;
  database: DatabaseConfig;
};
