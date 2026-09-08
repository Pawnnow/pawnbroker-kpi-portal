// Ported verbatim (logic unchanged) from PawnMate_KPI_Extractor_v9_9_1.html.
// These are the low-level building blocks every metric calculation depends on —
// do not "clean up" the numeric coercion or TAR parsing without testing against
// a real backup, several downstream calculations rely on their exact behavior
// (e.g. num()/int() silently returning 0 for null/blank/\N rather than NaN).

export type TsvRow = Record<string, string | null>;

export function num(v: string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function int(v: string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Month boundary calculation, in UTC epoch seconds, shifted by the configured
 * store-timezone offset. Ported from the original `monthBounds(year, month)`
 * global-state version — tzOffsetHours is now passed explicitly instead of
 * read from a module-level `let`, since this runs inside a React component
 * lifecycle rather than a single long-lived <script> tag.
 */
export function monthBounds(year: number, month: number, tzOffsetHours: number) {
  const offsetSec = Math.round(tzOffsetHours * 3600);
  const start = Date.UTC(year, month - 1, 1) / 1000 + offsetSec;
  const end =
    (month < 12 ? Date.UTC(year, month, 1) : Date.UTC(year + 1, 0, 1)) / 1000 + offsetSec;
  return { start, end };
}

// ─── TSV PARSER ──────────────────────────────────────────────────────────────
export function parseTSV(text: string, cols: string[]): TsvRow[] {
  const rows: TsvRow[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const row: TsvRow = {};
    cols.forEach((col, i) => {
      const v = parts[i];
      row[col] = v === '\\N' || v === undefined ? null : v;
    });
    rows.push(row);
  }
  return rows;
}

// ─── TAR PARSER (in-memory, no disk) ─────────────────────────────────────────
export function parseTar(arrayBuffer: ArrayBuffer): Map<string, string> {
  const files = new Map<string, string>();
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 0;
  const dec = new TextDecoder('latin1');

  function readString(start: number, length: number): string {
    let end = start + length;
    while (end > start && bytes[end - 1] === 0) end--;
    return dec.decode(bytes.slice(start, end));
  }

  while (offset + 512 <= bytes.length) {
    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (bytes[offset + i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) break;

    const name = readString(offset, 100).trim();
    const sizeOctal = readString(offset + 124, 12).trim();
    const typeflag = String.fromCharCode(bytes[offset + 156]);

    const fileSize = parseInt(sizeOctal, 8) || 0;
    offset += 512;

    if (typeflag === '0' || typeflag === '' || typeflag === '\0') {
      if (name && fileSize > 0) {
        const content = dec.decode(bytes.slice(offset, offset + fileSize));
        const basename = name.split('/').pop();
        if (basename) files.set(basename, content);
      }
    }
    offset += Math.ceil(fileSize / 512) * 512;
  }
  return files;
}

// ─── RAW TAR DETECTION ────────────────────────────────────────────────────────
// PawnMate's multi-store export ships as a bare POSIX/GNU tar — it does not
// need to be wrapped in a ZIP at all. We sniff the tar magic ("ustar" at byte
// offset 257) directly on the uploaded file so users can upload the .tar as-is
// instead of having to zip it (which, if done by extracting-then-rezipping,
// destroys the very tar structure this tool relies on for the location split).
export async function detectRawTar(file: File): Promise<boolean> {
  try {
    const headBuf = await file.slice(0, 512).arrayBuffer();
    const headBytes = new Uint8Array(headBuf);
    const magic = new TextDecoder('latin1').decode(headBytes.slice(257, 262));
    return magic === 'ustar';
  } catch {
    return false;
  }
}
