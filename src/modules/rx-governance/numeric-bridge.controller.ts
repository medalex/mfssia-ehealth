import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NumericBridgeService } from './numeric-bridge.service';
import { SemanticConflict } from './semantic-conflict.exception';

@ApiTags('rx-governance')
@Controller('rx-governance/bridges')
export class NumericBridgeController {
  constructor(private readonly service: NumericBridgeService) {}

  @Get()
  @ApiOperation({ summary: 'List numeric alignment bridges (theory T) from DKG' })
  @ApiResponse({ status: 200 })
  async list() {
    return this.service.queryBridges();
  }

  @Post()
  @ApiOperation({
    summary: 'Publish a DAO-approved numeric alignment bridge to DKG',
    description:
      'Anchors an rx:NumericBridge governance asset — only if the DAO has approved it (403 otherwise). Called after a proposal reaches quorum.',
  })
  @ApiResponse({ status: 201, description: 'UAL of the published bridge asset' })
  @ApiResponse({ status: 403, description: 'Bridge is not DAO-approved' })
  async publish(@Body() body: { metric: string; fromUnit: string; toUnit: string; factor: number }) {
    return this.service.publishApprovedBridge(body);
  }

  @Post('normalize')
  @ApiOperation({
    summary: 'Normalise a lab value onto the governed scale (auto-escalates conflicts)',
    description:
      'Returns the value on the governance-approved scale. On a semantic conflict (metric arrives in a unit with no bridge in T) the missing bridge is auto-proposed to the DAO and a 409 is returned with the proposal details.',
  })
  @ApiResponse({ status: 200, description: '{ metric, unit, value, normalized, governedUnit }' })
  @ApiResponse({ status: 409, description: 'Semantic conflict — bridge auto-proposed to the DAO' })
  async normalize(@Body() body: { metric: string; value: number; unit: string }) {
    try {
      const bridges = await this.service.queryBridges();
      const governedUnit = bridges.find((b) => b.metric === body.metric)?.toUnit ?? null;
      const normalized = await this.service.normalize(body.metric, body.value, body.unit);
      return { ...body, normalized, governedUnit };
    } catch (e) {
      if (e instanceof SemanticConflict) {
        // Auto-escalation: propose the missing bridge to the DAO, then surface the conflict.
        const escalation = await this.service.escalate(e.metric, e.unit, e.governedUnit);
        throw new ConflictException({
          error: `semantic conflict: no numeric bridge for ${e.metric} '${e.unit}' -> '${e.governedUnit}'`,
          conflict: true,
          metric: e.metric,
          fromUnit: e.unit,
          toUnit: e.governedUnit,
          escalation,
        });
      }
      throw e;
    }
  }
}
