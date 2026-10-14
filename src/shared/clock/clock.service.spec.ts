import { describe, it, expect } from '@jest/globals';
import { AppConfigValidator } from '@/config/app/app-config.validator';
import validateConfig from '@/common/utils/validate-config';
import { ClockService } from './clock.service';

const baseEnv = { NODE_ENV: 'test', DKG_HOSTNAME: 'localhost', PUBLIC_KEY: 'pub', PRIVATE_KEY: 'priv' };
const configWith = (value: string | undefined) => ({ get: () => value }) as any;

describe('ClockService', () => {
  it('returns the configured reference time', () => {
    expect(new ClockService(configWith('2026-10-10T00:00:00Z')).now().toISOString()).toBe('2026-10-10T00:00:00.000Z');
  });

  it('falls back to the system clock when no reference time is configured', () => {
    const before = Date.now();
    const now = new ClockService(configWith(undefined)).now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
  });

  it('fails at construction (application start) on an unparseable reference time', () => {
    expect(() => new ClockService(configWith('not-a-date'))).toThrow(/Invalid EVIDENCE_REFERENCE_TIME/);
  });

  it('rejects a non-ISO-8601 EVIDENCE_REFERENCE_TIME during config validation', () => {
    expect(() => validateConfig({ ...baseEnv, EVIDENCE_REFERENCE_TIME: 'yesterday' }, AppConfigValidator))
      .toThrow(/EVIDENCE_REFERENCE_TIME/);
    expect(() => validateConfig({ ...baseEnv, EVIDENCE_REFERENCE_TIME: '2026-10-10T00:00:00Z' }, AppConfigValidator))
      .not.toThrow();
  });
});
