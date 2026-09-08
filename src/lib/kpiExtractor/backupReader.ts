import { BlobReader, TextWriter, ZipReader, type Entry, type FileEntry } from '@zip.js/zip.js';
import { detectRawTar, parseTSV, parseTar, type TsvRow } from './parseUtils';

export interface BackupLocationRow extends TsvRow {
  location_id: string | null;
  name: string | null;
  short_name: string | null;
}

export interface BackupHandle {
  isMultiStore: boolean;
  locations: BackupLocationRow[];
  loadTable: (name: string) => Promise<string | null>;
}

export class PasswordRequiredError extends Error {
  constructor() {
    super('This backup file is password protected. Enter the password and try again.');
    this.name = 'PasswordRequiredError';
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super('That password did not work for this backup file.');
    this.name = 'IncorrectPasswordError';
  }
}

const LOC_COLS = ['location_id', 'name', 'short_name'];

// ─── RAW TAR PATH (multi-store, uploaded directly, never encrypted) ──────────
async function openTarDirectly(
  file: File,
  log: (msg: string, type?: string) => void,
): Promise<BackupHandle> {
  log('  Raw .tar upload detected — parsing directly, no ZIP wrapper needed', 'success');
  const buf = await file.arrayBuffer();
  const tarFiles = parseTar(buf);
  log(`  Tar extracted: ${tarFiles.size} files found`, 'success');
  const locTxt = tarFiles.get('locations.txt');
  const locations = locTxt ? (parseTSV(locTxt, LOC_COLS) as BackupLocationRow[]) : [];
  if (locations.length) {
    log(
      `  locations.txt → ${locations
        .map((l) => `id=${l.location_id} "${l.short_name || l.name}"`)
        .join('  |  ')}`,
    );
  } else {
    log(
      '  ⚠ locations.txt missing or empty inside tar — store→location_id mapping will fall back to positional guess',
      'warn',
    );
  }
  return {
    isMultiStore: true,
    locations,
    loadTable: async (name: string) => tarFiles.get(name) ?? null,
  };
}

// ─── BACKUP LOADER ────────────────────────────────────────────────────────────
// Mirrors the original tool's openBackup(): a .tar entry inside the ZIP is the
// authoritative multi-store signal, taking precedence over any flat pawn.txt
// that might also be present. Extended here to support password-protected
// ZIPs — the original used JSZip, which cannot read encrypted entries at all;
// this uses zip.js, which transparently handles both legacy ZipCrypto and
// WinZip/7-Zip AES-256 encrypted entries when a password is supplied.
export async function openBackup(
  file: File,
  password: string | undefined,
  log: (msg: string, type?: string) => void,
): Promise<BackupHandle> {
  if (await detectRawTar(file)) {
    return openTarDirectly(file, log);
  }

  const zipReader = new ZipReader(new BlobReader(file), password ? { password } : undefined);
  let entries: Entry[];
  try {
    entries = await zipReader.getEntries();
  } catch (e) {
    await zipReader.close().catch(() => {});
    throw new Error(
      `Could not read this file as a ZIP or TAR backup (${e instanceof Error ? e.message : 'unknown error'}).`,
    );
  }

  const anyEncrypted = entries.some((e) => e.encrypted);
  if (anyEncrypted && !password) {
    await zipReader.close().catch(() => {});
    throw new PasswordRequiredError();
  }

  const keys = entries.map((e) => e.filename);
  log(
    `  ZIP contains ${keys.length} entries. Top-level: ${keys
      .filter((k) => !k.includes('/') || k.split('/').length <= 2)
      .slice(0, 20)
      .join(', ')}${keys.length > 20 ? ' …' : ''}`,
  );

  const entryByName = new Map(entries.map((e) => [e.filename, e] as const));

  function asFileEntry(entry: Entry): FileEntry {
    // entry.directory is a proper discriminant (DirectoryEntry.directory: true vs
    // FileEntry.directory: false) but TS doesn't narrow it automatically here because
    // both interfaces inherit the wider `directory: boolean` from their shared base
    // (EntryMetaData) — the runtime check below is what actually guarantees this cast.
    if (entry.directory) throw new Error(`Entry ${entry.filename} is a directory, not a file`);
    return entry as FileEntry;
  }

  async function readEntryText(entry: Entry): Promise<string> {
    const fileEntry = asFileEntry(entry);
    try {
      return await fileEntry.getData(new TextWriter());
    } catch (e) {
      if (fileEntry.encrypted) throw new IncorrectPasswordError();
      throw e;
    }
  }

  async function readEntryArrayBuffer(entry: Entry): Promise<ArrayBuffer> {
    const fileEntry = asFileEntry(entry);
    try {
      return await fileEntry.arrayBuffer();
    } catch (e) {
      if (fileEntry.encrypted) throw new IncorrectPasswordError();
      throw e;
    }
  }

  const tarKey = keys.find((k) => k.endsWith('.tar'));
  const flatKey = keys.find((k) => k.endsWith('/pawn.txt') || k === 'pawn.txt');

  if (tarKey) {
    log(`  Multi-store backup detected — tar entry: ${tarKey}`);
    if (flatKey) {
      log(
        `  ⚠ Also found a flat "${flatKey}" alongside the tar — ignoring it and using the tar (location-split) data instead`,
        'warn',
      );
    }
    const tarBuf = await readEntryArrayBuffer(entryByName.get(tarKey)!);
    const tarFiles = parseTar(tarBuf);
    log(`  Tar extracted: ${tarFiles.size} files found`, 'success');
    const locTxt = tarFiles.get('locations.txt');
    const locations = locTxt ? (parseTSV(locTxt, LOC_COLS) as BackupLocationRow[]) : [];
    if (locations.length) {
      log(
        `  locations.txt → ${locations
          .map((l) => `id=${l.location_id} "${l.short_name || l.name}"`)
          .join('  |  ')}`,
      );
    } else {
      log(
        '  ⚠ locations.txt missing or empty inside tar — store→location_id mapping will fall back to positional guess',
        'warn',
      );
    }
    return {
      isMultiStore: true,
      locations,
      loadTable: async (name: string) => tarFiles.get(name) ?? null,
    };
  } else if (flatKey) {
    const basePath = flatKey.replace('pawn.txt', '');
    log(`  Single-store backup — database folder: ${basePath || '(root)'}`);
    return {
      isMultiStore: false,
      locations: [],
      loadTable: async (name: string) => {
        const entry = entryByName.get(basePath + name);
        if (!entry) return null;
        return await readEntryText(entry);
      },
    };
  } else {
    await zipReader.close().catch(() => {});
    throw new Error('Could not identify backup structure. Is this a valid PawnMate backup?');
  }
}
