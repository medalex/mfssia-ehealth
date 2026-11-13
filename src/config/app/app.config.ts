import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';
import { AppConfigValidator } from './app-config.validator';
import validateConfig from 'src/common/utils/validate-config';

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, AppConfigValidator);

  const port = parseInt(process.env.APP_PORT || '4000', 10);
  const labStaleAfterDays = Number.parseInt(process.env.EVIDENCE_LAB_STALE_AFTER_DAYS || '90', 10);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'MFSSIA API',
    port,
    apiPrefix: process.env.API_PREFIX?.replace(/^\//, '') || 'api', // strip leading slash if present
    labStaleAfterDays: Number.isFinite(labStaleAfterDays) && labStaleAfterDays > 0 ? labStaleAfterDays : 90,
    evidenceReferenceTime: process.env.EVIDENCE_REFERENCE_TIME || undefined,

    dkg: {
      url: process.env.DKG_V10_URL || 'http://localhost:9200',
      token: process.env.DKG_V10_TOKEN || '',
      contextGraph: process.env.DKG_CONTEXT_GRAPH || 'mfssia-ehealth',
      writeMode: (process.env.DKG_WRITE_MODE || 'draft') as AppConfig['dkg']['writeMode'],
    },

    isDkgMocked: process.env.IS_DKG_MOCKED === 'true',
  };
});
