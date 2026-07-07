import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NumericBridgeService } from './numeric-bridge.service';

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
    summary: 'Publish a numeric alignment bridge to DKG',
    description: 'Anchors an rx:NumericBridge governance asset. Used by DAO-approved bridge additions.',
  })
  @ApiResponse({ status: 201, description: 'UAL of the published bridge asset' })
  async publish(@Body() body: { metric: string; fromUnit: string; toUnit: string; factor: number }) {
    return this.service.publishBridge(body);
  }

  @Post('normalize')
  @ApiOperation({
    summary: 'Normalise a lab value onto the governed scale',
    description:
      'Returns the value on the governance-approved scale. 409 Semantic Conflict if the metric arrives in a unit with no bridge in T (escalation trigger).',
  })
  @ApiResponse({ status: 200, description: '{ metric, unit, value, normalized, governedUnit }' })
  @ApiResponse({ status: 409, description: 'Semantic conflict — no bridge for (metric, unit)' })
  async normalize(@Body() body: { metric: string; value: number; unit: string }) {
    const bridges = await this.service.queryBridges();
    const governedUnit =
      bridges.find((b) => b.metric === body.metric)?.toUnit ?? null;
    const normalized = await this.service.normalize(body.metric, body.value, body.unit);
    return { ...body, normalized, governedUnit };
  }
}
