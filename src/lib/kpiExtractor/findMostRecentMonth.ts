import { int, monthBounds, type TsvRow } from './parseUtils';

export interface MostRecentMonthInputs {
  allInvVals: TsvRow[];
  allSos: TsvRow[];
  allPawns: TsvRow[];
  allTxns: TsvRow[];
}

/**
 * Finds the latest month that the backup can confirm is fully closed out.
 *
 * Rationale: PawnMate's daily inventory_value snapshot is the most reliable
 * "the day has ended" signal already used elsewhere in this tool (see the
 * ending-inventory / aging "stamped" snapshot logic) — if the backup contains
 * a snapshot timestamped at or after a month's end, that month's activity is
 * fully captured. Picking a month without that guarantee risks silently
 * under-reporting a still-in-progress month as if it were complete.
 *
 * Falls back to sales_order / pawn / transaction timestamps only if
 * inventory_value is missing or empty, with a wider tolerance (this is a
 * weaker signal — it just means "we saw activity in this month", not
 * "this month is closed out").
 */
export function findMostRecentMonth(
  inputs: MostRecentMonthInputs,
  tzOffsetHours: number,
): { year: number; month: number } | null {
  const invTimestamps = inputs.allInvVals
    .map((r) => int(r.timestamp))
    .filter((t) => t > 0);

  if (invTimestamps.length > 0) {
    const maxTs = Math.max(...invTimestamps);
    const d = new Date(maxTs * 1000);
    let year = d.getUTCFullYear();
    let month = d.getUTCMonth() + 1;

    // Walk backward until we find a month whose end boundary is at or before
    // the latest snapshot we actually have — i.e. a month we know closed out.
    for (let guard = 0; guard < 36; guard++) {
      const { end } = monthBounds(year, month, tzOffsetHours);
      if (end <= maxTs + 1) {
        return { year, month };
      }
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
    }
    return null;
  }

  // Fallback: no inventory_value data at all — use the latest month with any
  // recorded activity, with no "closed out" guarantee (caller should log this
  // as a weaker signal).
  const fallbackTimestamps = [
    ...inputs.allSos.map((r) => int(r.created_date)),
    ...inputs.allPawns.map((r) => int(r.created_date)),
    ...inputs.allTxns.map((r) => int(r.start_time)),
  ].filter((t) => t > 0);

  if (fallbackTimestamps.length === 0) return null;

  const maxTs = Math.max(...fallbackTimestamps);
  const d = new Date(maxTs * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
