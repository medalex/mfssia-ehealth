import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Raised when a clinical metric arrives in a unit/standard that has no numeric
 * alignment bridge in theory T. AttrValue is then *undefined* (not false), so the
 * governed statement cannot be evaluated — the escalation trigger of the paper's
 * numerical-conflict case. The payload carries exactly what the DAO must approve:
 * a bridge (metric, fromUnit → governedUnit).
 */
export class SemanticConflict extends HttpException {
  constructor(
    readonly metric: string,
    readonly unit: string,
    readonly governedUnit: string,
  ) {
    super(
      {
        error: `semantic conflict: no numeric bridge for ${metric} '${unit}' -> '${governedUnit}'`,
        conflict: true,
        metric,
        fromUnit: unit,
        toUnit: governedUnit,
      },
      HttpStatus.CONFLICT,
    );
  }
}
