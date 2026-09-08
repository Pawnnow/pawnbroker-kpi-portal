import { supabase } from "@/integrations/supabase/client";
import type { ExtractedKpiRow } from "@/lib/kpiExtractor/extractEngine";

const BATCH_SIZE = 500;

export interface WriteResult {
  written: number;
  batches: number;
}

/**
 * Writes extracted KPI rows to public.kpi_entries.
 *
 * Uses upsert against the existing unique index
 * (user_id, location_id, year, month, field_name) rather than the manual
 * entry page's delete-then-insert pattern — the index already enforces
 * exactly the identity kpi_entries needs, so an upsert is simpler and avoids
 * a window where rows are briefly missing between delete and insert.
 *
 * Only columns that exist on kpi_entries are sent — store_code/store_name
 * (useful for the on-screen preview) are dropped here, not written to the DB.
 */
export async function writeKpiEntries(
  userId: string,
  rows: ExtractedKpiRow[],
): Promise<WriteResult> {
  if (rows.length === 0) return { written: 0, batches: 0 };

  const payload = rows.map((r) => ({
    user_id: userId,
    year: r.year,
    month: r.month,
    category: r.category,
    field_name: r.field_name,
    field_label: r.field_label,
    field_value: r.field_value === null || r.field_value === undefined ? null : String(r.field_value),
    location_id: r.location_id,
    currency: r.currency,
  }));

  let written = 0;
  let batches = 0;

  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("kpi_entries")
      .upsert(batch, { onConflict: "user_id,location_id,year,month,field_name" });

    if (error) {
      throw new Error(
        `Failed writing rows ${i + 1}-${i + batch.length} of ${payload.length}: ${error.message}`,
      );
    }
    written += batch.length;
    batches += 1;
  }

  return { written, batches };
}
