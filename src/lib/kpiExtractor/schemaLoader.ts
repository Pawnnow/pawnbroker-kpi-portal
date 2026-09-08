// PawnMate periodically adds columns to its tables (e.g. round_layaway_pmt_up
// was added to sales_order, rfid_tag/rfid_print_serial to inventory, in a
// mid-2026 update). A hardcoded column-position list silently breaks — every
// field after an insertion point reads the wrong data with no error — the
// moment PawnMate ships a schema change. Every backup ships a matching .sql
// schema dump alongside each .txt data file, so we parse the authoritative
// column order from CREATE TABLE directly instead of trusting a fixed list.
// The FALLBACK_* lists in constants.ts are used only if a .sql file is
// missing or fails to parse.
export function parseColumnsFromSql(sqlText: string | null | undefined): string[] | null {
  if (!sqlText) return null;
  const lines = sqlText.split('\n');
  const cols: string[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (/^CREATE\s+TABLE/i.test(trimmed)) inTable = true;
      continue;
    }
    // Closing paren of the CREATE TABLE statement (e.g. ") ENGINE=InnoDB...")
    // ends the column list. Constraint/index lines (PRIMARY KEY, KEY,
    // UNIQUE KEY, CONSTRAINT...) start with a keyword, not a backtick, so
    // only genuine column-definition lines get picked up here.
    if (trimmed.startsWith(')')) break;
    if (trimmed.startsWith('`')) {
      const m = trimmed.match(/^`([^`]+)`/);
      if (m) cols.push(m[1]);
    }
  }
  return cols.length > 0 ? cols : null;
}

export async function loadColumns(
  tableBase: string,
  fallbackCols: string[],
  loadSqlText: (name: string) => Promise<string | null>,
  log: (msg: string, type?: string) => void,
): Promise<string[]> {
  const sqlText = await loadSqlText(tableBase + '.sql');
  const parsed = parseColumnsFromSql(sqlText);
  if (!parsed || parsed.length < 3) {
    log(
      `  ⚠ ${tableBase}.sql missing/unparseable — using built-in reference schema (${fallbackCols.length} cols). May be stale if PawnMate has changed this table.`,
      'warn',
    );
    return fallbackCols;
  }
  const added = parsed.filter((c) => !fallbackCols.includes(c));
  const removed = fallbackCols.filter((c) => !parsed.includes(c));
  if (added.length || removed.length) {
    log(
      `  ⚠ ${tableBase}: live schema (${parsed.length} cols) differs from reference (${fallbackCols.length}) — added:[${added.join(', ') || 'none'}] removed:[${removed.join(', ') || 'none'}]. Using live schema from ${tableBase}.sql.`,
      'warn',
    );
  }
  return parsed;
}
