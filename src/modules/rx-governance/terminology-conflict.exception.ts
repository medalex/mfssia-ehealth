import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Raised when a clinical concept arrives in a coding system that has no rx:alignsTo
 * axiom in theory T, so the system cannot decide whether it denotes a governed concept
 * (e.g. whether a locally-coded allergy refers to rx:Penicillin). The truth of the
 * dependent statement is then *undefined* (not false) — the escalation trigger of the
 * paper's terminological-conflict case. The payload carries what the DAO must approve:
 * an alignment (system, code) -> governed concept.
 */
export class TerminologyConflict extends HttpException {
  constructor(
    readonly system: string,
    readonly code: string,
    readonly term?: string,
  ) {
    super(
      {
        error: `terminological conflict: no alignment axiom for '${system}:${code}'`,
        conflict: true,
        conflictType: 'terminology',
        system,
        code,
        term,
      },
      HttpStatus.CONFLICT,
    );
  }
}
