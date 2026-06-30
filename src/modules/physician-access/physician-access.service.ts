import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DkgService } from '@/providers/dkg/dkg.service';
import { PhysicianRegistryService } from '../physician-registry/physician-registry.service';

export interface AccessDecision {
  access: boolean; // ALL_MANDATORY: authN AND authZ
  authn: boolean; // C-DOC-AUTH  — physician in registry
  authz: boolean; // C-DOC-AUTHZ — consent covers physician's organization
  challengeSet: string;
  nonce: string;
  organizationId: string | null;
  reason: string;
}

// Runs the ConsentAccessSet (ALL_MANDATORY) for a physician↔patient pair.
//   C-DOC-AUTH  — physician is a member of the governance-approved registry (root_M)
//   C-DOC-AUTHZ — patient's DataSharingConsent (in DKG) covers the physician's organization
// Access is granted only when both challenges pass.
@Injectable()
export class PhysicianAccessService {
  private readonly logger = new Logger(PhysicianAccessService.name);
  private static readonly CHALLENGE_SET = 'ConsentAccessSet';

  // Recent gate decisions (in-memory ring buffer) so the monitor can show the latest
  // real physician↔patient check instead of a synthetic sample.
  private readonly recent: Array<AccessDecision & { doctorId: string; patientId: string; at: string }> = [];

  constructor(
    private readonly dkgService: DkgService,
    private readonly registry: PhysicianRegistryService,
  ) {}

  async checkAccess(doctorId: string, patientId: string): Promise<AccessDecision> {
    const decision = await this.evaluate(doctorId, patientId);
    this.recent.unshift({ ...decision, doctorId, patientId, at: new Date().toISOString() });
    if (this.recent.length > 20) this.recent.pop();
    return decision;
  }

  // Latest gate decisions, most recent first.
  getRecent(limit = 10): unknown[] {
    return this.recent.slice(0, limit);
  }

  private async evaluate(doctorId: string, patientId: string): Promise<AccessDecision> {
    // Fresh per-request nonce (challenge instance) — liveness / replay protection
    const nonce = `0x${crypto.randomBytes(16).toString('hex')}`;

    // ── C-DOC-AUTH: physician must be in the registry ──────────────────────────
    let organizationId: string | null = null;
    let authn = false;
    try {
      const physician = this.registry.findById(doctorId);
      organizationId = physician.organizationId;
      authn = true;
    } catch {
      return {
        access: false,
        authn: false,
        authz: false,
        challengeSet: PhysicianAccessService.CHALLENGE_SET,
        nonce,
        organizationId: null,
        reason: `C-DOC-AUTH failed: physician ${doctorId} not in MFSSIA registry`,
      };
    }

    // ── C-DOC-AUTHZ: patient consent must cover the physician's organization ────
    const authz = await this.consentCoversOrganization(patientId, organizationId!);

    const access = authn && authz;
    return {
      access,
      authn,
      authz,
      challengeSet: PhysicianAccessService.CHALLENGE_SET,
      nonce,
      organizationId,
      reason: access
        ? 'Access granted: physician authenticated and consent covers organization'
        : `C-DOC-AUTHZ failed: no valid consent from patient ${patientId} covering ${organizationId}`,
    };
  }

  // SPARQL lookup in DKG: does an unexpired DataSharingConsent cover this org?
  private async consentCoversOrganization(
    patientId: string,
    organizationId: string,
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();
    // Exclude consents that have a ConsentRevocation tombstone (append-only revocation).
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT ?c WHERE {
        ?c a rx:DataSharingConsent ;
           rx:patient "${patientId}" ;
           rx:consentCovers "${organizationId}" ;
           rx:validUntil ?validUntil .
        FILTER(?validUntil > "${nowIso}"^^xsd:dateTime)
        FILTER NOT EXISTS { ?rev rx:revokes ?c }
      }
    `;

    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result ?? [];
      return Array.isArray(rows) && rows.length > 0;
    } catch (e: any) {
      this.logger.warn(`Consent SPARQL lookup failed: ${e.message}`);
      return false;
    }
  }
}
