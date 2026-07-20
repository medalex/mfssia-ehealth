import { Body, ConflictException, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TerminologyBridgeService } from './terminology-bridge.service';
import { TerminologyConflict } from './terminology-conflict.exception';

@ApiTags('rx-governance')
@Controller('rx-governance/terminology')
export class TerminologyBridgeController {
  constructor(private readonly service: TerminologyBridgeService) {}

  @Get()
  @ApiOperation({ summary: 'List terminology alignment axioms (rx:alignsTo, theory T) from DKG' })
  @ApiResponse({ status: 200 })
  async list() {
    return this.service.queryBridges();
  }

  @Post('propose')
  @ApiOperation({
    summary: 'Propose a terminology alignment to the DAO for approval',
    description: 'Opens a governance proposal for an rx:alignsTo axiom (same lifecycle as numeric bridges).',
  })
  @ApiResponse({ status: 201, description: '{ proposalId, ... }' })
  async propose(@Body() body: { system: string; code: string; term?: string; alignsTo: string }) {
    return this.service.proposeBridge(body);
  }

  @Post()
  @ApiOperation({
    summary: 'Publish a DAO-approved terminology alignment to DKG',
    description:
      'Anchors an rx:TerminologyBridge governance asset — only if the DAO has approved it (403 otherwise). Set ?direct=true to bypass the gate (setup/genesis).',
  })
  @ApiResponse({ status: 201, description: 'UAL of the published alignment asset' })
  @ApiResponse({ status: 403, description: 'Alignment is not DAO-approved' })
  async publish(
    @Body() body: { system: string; code: string; term?: string; alignsTo: string },
    @Query('direct') direct?: string,
  ) {
    return direct === 'true'
      ? this.service.publishBridge(body)
      : this.service.publishApprovedBridge(body);
  }

  @Post('align')
  @ApiOperation({
    summary: 'Resolve a coded clinical concept to its governed rx concept (auto-escalates conflicts)',
    description:
      'Returns the governed concept for (system, code). On a terminological conflict (no rx:alignsTo axiom in T) the missing alignment is auto-proposed to the DAO and a 409 is returned with the proposal details.',
  })
  @ApiResponse({ status: 200, description: '{ system, code, alignsTo }' })
  @ApiResponse({ status: 409, description: 'Terminological conflict — alignment auto-proposed to the DAO' })
  async align(@Body() body: { system: string; code: string; term?: string }) {
    try {
      const alignsTo = await this.service.align(body.system, body.code, body.term);
      return { ...body, alignsTo };
    } catch (e) {
      if (e instanceof TerminologyConflict) {
        const escalation = await this.service.escalate(e.system, e.code, e.term);
        throw new ConflictException({
          error: `terminological conflict: no alignment axiom for '${e.system}:${e.code}'`,
          conflict: true,
          conflictType: 'terminology',
          system: e.system,
          code: e.code,
          term: e.term,
          escalation,
        });
      }
      throw e;
    }
  }
}
