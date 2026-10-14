import { describe, it, expect, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';

describe('AuditLogController', () => {
  it('rejects requests that do not include runId with 400', () => {
    const controller = new AuditLogController({ listByRunId: jest.fn() } as any);
    expect(() => controller.getByRunId(undefined as any)).toThrow(BadRequestException);
  });

  it('returns invalid_request with reason in the 400 body', () => {
    const controller = new AuditLogController({ listByRunId: jest.fn() } as any);
    try {
      controller.getByRunId('' as any);
      throw new Error('expected BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as BadRequestException).getResponse()).toEqual({ error: 'invalid_request', reason: 'runId is required' });
    }
  });
});
