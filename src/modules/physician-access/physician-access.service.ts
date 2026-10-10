import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DkgService } from '@/providers/dkg/dkg.service';
import { DkgUnavailableException } from '@/shared/exceptions/dkg-unavailable.exception';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PhysicianRegistryService } from '../physician-registry/physician-registry.service';
import {
  CHALLENGE_AUTH,
  CHALLENGE_AUTHZ,
  CONSENT_ACCESS_SET,
} from '../consent-access/consent-access.challenges';

export interface AccessDecision {
  access: boolean; // ALL_MANDATORY: authN AND authZ
  authn: boolean; // C-DOC-AUTH  — physician in registry
  // C-DOC-AUTHZ — consent covers physician's organization and custodian. null when the challenge could
  // not be evaluated at all: it reads the organization off the registry entry, so a
  // physician who fails C-DOC-AUTH leaves nothing to check consent against. Distinct from
  // false, which means the consent was looked up in DKG and did not cover the org.
  authz: boolean | null;
  challengeSet: string;
  nonce: string;
  organizationId: string | null;
  custodianId: string;
  reason: string;
}

// Runs the ConsentAccessSet (ALL_MANDATORY) for a physician↔patient pair.
//   C-DOC-AUTH  — physician is a member of the governance-approved registry (root_M)
//   C-DOC-AUTHZ — patient's DataSharingConsent (in DKG) covers the physician's organization and custodian
// Access is granted only when both challenges pass.
@Injectable()
export class PhysicianAccessService {
  private readonly logger = new Logger(PhysicianAccessService.name);
  private static readonly CHALLENGE_SET = 'ConsentAccessSet';

  constructor(
    private readonly dkgService: DkgService,
    private readonly registry: PhysicianRegistryService,
    private readonly auditLog: AuditLogService,
  ) {}

  async checkAccess(doctorId: string, patientId: string, custodianId: string): Promise<AccessDecision> {
    try {
      const decision = await this.evaluate(doctorId, patientId, custodianId);
      await this.auditLog.record({
        eventType: 'access.decision',
        outcome: decision.access ? 'granted' : 'denied',
        patientId,
        doctorId,
        organizationId: decision.organizationId,
        custodianId,
        resource: 'ConsentAccessSet',
        reason: decision.access ? 'granted' : 'access_denied',
        details: {
          access: decision.access,
          authn: decision.authn,
          authz: decision.authz,
          nonce: decision.nonce,
          explanation: decision.reason,
        },
      });
      return decision;
    } catch (e: any) {
      await this.auditLog.record({
        eventType: 'access.decision',
        outcome: 'unavailable',
        patientId,
        doctorId,
        organizationId: null,
        custodianId,
        resource: 'ConsentAccessSet',
        reason: 'unavailable',
        details: { authz: null, error: e?.message ?? 'Access decision could not be evaluated' },
      });
      throw e;
    }
  }

  async getRecent(limit = 10) {
    return this.auditLog.recentAccess(limit);
  }

  // The governance challenge documents as anchored in the DKG (challenge side).
  getChallengeDocuments() {
    return { set: CONSENT_ACCESS_SET, factors: [CHALLENGE_AUTH, CHALLENGE_AUTHZ] };
  }

  // The patient's DataSharingConsent documents reconstructed from the DKG (response side).
  async getConsentDocuments(patientId: string): Promise<unknown[]> {
    const sparql = `
      PREFIX rx: <https://mfssia.io/ontology/prescription#>
      SELECT ?c ?org ?custodian ?grantedAt ?validUntil WHERE {
        ?c a rx:DataSharingConsent ;
           rx:patient "${patientId}" ;
           rx:consentCovers ?org ;
           rx:consentCoversCustodian ?custodian ;
           rx:validUntil ?validUntil .
        OPTIONAL { ?c rx:grantedAt ?grantedAt }
        FILTER NOT EXISTS { ?rev rx:revokes ?c }
      }
    `;
    const clean = (v: any): string => {
      const s = typeof v === 'string' ? v : (v?.value ?? '');
      return s.replace(/\^\^.*$/, '').replace(/^"|"$/g, '');
    };
    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result;
      if (!Array.isArray(rows)) throw new Error('Unexpected DKG SPARQL response');
      return (Array.isArray(rows) ? rows : []).map((r: any) => ({
        '@type': 'rx:DataSharingConsent',
        '@id': clean(r.c),
        'rx:patient': patientId,
        'rx:consentCovers': clean(r.org),
        'rx:consentCoversCustodian': clean(r.custodian),
        'rx:grantedAt': clean(r.grantedAt),
        'rx:validUntil': clean(r.validUntil),
      }));
    } catch (e: any) {
      this.logger.warn(`Consent document lookup failed: ${e.message}`);
      throw new DkgUnavailableException('DKG unavailable while reading consent documents', e);
    }
  }

  private async evaluate(doctorId: string, patientId: string, custodianId: string): Promise<AccessDecision> {
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
        authz: null, // not evaluated — no registry entry means no organization to check
        challengeSet: PhysicianAccessService.CHALLENGE_SET,
        nonce,
        organizationId: null,
        custodianId,
        reason: `C-DOC-AUTH failed: physician ${doctorId} not in MFSSIA registry`,
      };
    }

    // ── C-DOC-AUTHZ: patient consent must cover the physician's organization ────
    const authz = await this.consentCoversScope(patientId, organizationId!, custodianId);

    const access = authn && authz;
    return {
      access,
      authn,
      authz,
      challengeSet: PhysicianAccessService.CHALLENGE_SET,
      nonce,
      organizationId,
      custodianId,
      reason: access
        ? 'Access granted: physician authenticated and consent covers organization and custodian'
        : `C-DOC-AUTHZ failed: no valid consent from patient ${patientId} covering ${organizationId} and custodian ${custodianId}`,
    };
  }

  // SPARQL lookup in DKG: does an unexpired DataSharingConsent cover this org and custodian?
  private async consentCoversScope(
    patientId: string,
    organizationId: string,
    custodianId: string,
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
           rx:consentCoversCustodian "${custodianId}" ;
           rx:validUntil ?validUntil .
        FILTER(?validUntil > "${nowIso}"^^xsd:dateTime)
        FILTER NOT EXISTS { ?rev rx:revokes ?c }
      }
    `;

    try {
      const result = (await this.dkgService.findAssets(sparql)) as any;
      const rows = result?.data ?? result;
      if (!Array.isArray(rows)) throw new Error('Unexpected DKG SPARQL response');
      return rows.length > 0;
    } catch (e: any) {
      this.logger.warn(`Consent SPARQL lookup failed: ${e.message}`);
      throw new DkgUnavailableException('DKG unavailable while checking patient consent', e);
    }
  }
}
