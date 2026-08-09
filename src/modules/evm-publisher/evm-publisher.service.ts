import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Thin client for the ehealth-evm publication endpoints. Kept dependency-free so both the
// governance sync and the record services can use it without a circular module import.
@Injectable()
export class EvmPublisherService {
  private readonly logger = new Logger(EvmPublisherService.name);

  private readonly evmUrl = process.env.EVM_URL ?? 'http://evm:3010';
  private readonly adminToken = process.env.EVM_ADMIN_TOKEN ?? '';

  private async post(path: string, body: unknown, admin = false): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (admin) {
      if (!this.adminToken) {
        throw new ServiceUnavailableException(
          `EVM_ADMIN_TOKEN is not set — cannot publish to ${path}`,
        );
      }
      headers['x-admin-token'] = this.adminToken;
    }
    let resp: Response;
    try {
      resp = await fetch(`${this.evmUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    } catch (e: any) {
      // A connection failure is the divergence case that matters most: the DKG write has
      // already happened. Name it, rather than letting a raw fetch error surface as a
      // generic 500 that says nothing about what is now out of step.
      throw new ServiceUnavailableException(
        `cannot reach the on-chain verifier at ${this.evmUrl}${path} (${e.message}) — the DKG was ` +
        `updated but the governed state was NOT published on-chain. Proofs will be rejected as a ` +
        `governance mismatch until POST /governance-sync succeeds.`,
      );
    }
    const parsed: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new ServiceUnavailableException(
        `on-chain publication to ${path} failed (HTTP ${resp.status}): ${parsed?.error ?? 'no detail'}`,
      );
    }
    return parsed;
  }

  postGovernanceVector(vector: string[]) {
    return this.post('/governance/vector', { vector });
  }

  postApprovedValidFor(durations: string[]) {
    return this.post('/governance/validfor', { durations });
  }

  postRootSets(body: { patientRecordRoots?: string[]; labRecordRoots?: string[]; mode: 'replace' | 'add' }) {
    return this.post('/admin/roots', body, true);
  }

  // A patient's record root changes when an allergy or a lab result is added — writes that
  // happen in patient-api / lab-api, which mfssia never observes. The moment the change
  // becomes relevant is when a proof is served against the new root, so the serving path
  // publishes it additively. Best-effort by design: a publication failure must not break
  // proof retrieval, and it is loud in the log. A root that never reaches the verifier is
  // fail-closed anyway (the proof is rejected as an unknown record root).
  async addRootBestEffort(kind: 'patient' | 'lab', root: string): Promise<void> {
    try {
      await this.postRootSets(
        kind === 'patient' ? { patientRecordRoots: [root], mode: 'add' } : { labRecordRoots: [root], mode: 'add' },
      );
    } catch (e: any) {
      this.logger.warn(`Could not publish ${kind} record root ${root} to the verifier: ${e.message}`);
    }
  }
}
