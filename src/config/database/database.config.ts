import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import path from 'path';
import { DatabaseConfig } from './database-config.type';

export function getConfig(): DatabaseConfig {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL, // Direct Supabase connection string
    logging: process.env.DATABASE_LOGGING === 'true',
    // synchronize: true, // true only in dev
    synchronize: false, // Using migrations instead
    ssl: {
      rejectUnauthorized:
        process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' || false,
    },
    extra: {
      family: 4, // Force IPv4 to fix ENETUNREACH
    },
    entities: [
      path.join(__dirname, '..', '..', '/**/entities/*.entity{.ts,.js}'),
    ],
    migrations: [
      path.join(__dirname, '..', '..', '/database/migrations/**/*{.ts,.js}'),
    ],
    migrationsTableName: 'migrations',
    seeds: [path.join(__dirname, '..', '..', '/database/seeds/**/*{.ts,.js}')],
    seedTracking: true,
    seedTableName: 'seeders',
    useUTC: true,
  };
}

export default registerAs<DatabaseConfig>('database', () => {
  Logger.log(`Registering DatabaseConfig from environment variables`);
  const config = getConfig();
  return config;
});
