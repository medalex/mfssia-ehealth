import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService, validateRunId } from './audit-log.service';

@ApiTags('audit-events')
@Controller('audit-events')
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit events for a single runId, sorted by creation time ascending' })
  getByRunId(@Query('runId') runId: string) {
    const resolvedRunId = validateRunId(runId);
    if (!resolvedRunId) {
      throw new BadRequestException({ error: 'invalid_request', reason: 'runId is required' });
    }
    return this.auditLog.listByRunId(resolvedRunId);
  }
}
