// PawnMate KPI extraction engine.
//
// This is a structural port of PawnMate_KPI_Extractor_v9_9_1.html's core
// calculation logic (everything that used to feed the CSV/Excel export) into
// a standalone, testable function. The business logic itself — every filter,
// bucket, and reduce below — is copied verbatim from the original tool and
// should NOT be modified without cross-checking against it; it has been
// validated against real backups and cross-checked to the penny against
// PawnMate's own dashboard. Only the "shell" changed:
//   - input:  a File + optional password instead of a pre-selected <input>,
//             and identity/store/month values passed as parameters instead
//             of read from hardcoded arrays and DOM elements
//   - output: an array of rows shaped for the kpi_entries table, instead of
//             a CSV Blob (the Excel-building code has no DB equivalent and
//             was dropped entirely — see KPI_IMPORT_NOTES.md)
//
// See backupReader.ts, schemaLoader.ts, and parseUtils.ts for the pieces this
// engine depends on.

import {
  PLACEHOLDER_THRESHOLD,
  NAME_TO_CAT,
  CHILD_OVERRIDES,
  CATEGORIES_ORDERED,
  normalizeCatName,
  FALLBACK_PAWN_COLS,
  FALLBACK_EXT_COLS,
  FALLBACK_BUYIN_COLS,
  FALLBACK_TD_COLS,
  FALLBACK_T_COLS,
  FALLBACK_SO_COLS,
  FALLBACK_SOD_COLS,
  FALLBACK_LAY_COLS,
  FALLBACK_SCRAP_COLS,
  FALLBACK_PICKED_UP_COLS,
  FALLBACK_PBAV_COLS,
  FALLBACK_INV_COLS,
  FALLBACK_INVVAL_COLS,
  FALLBACK_PT_COLS,
  FALLBACK_REPAIR_PAY_COLS,
  FALLBACK_INVSTOCK_COLS,
  FALLBACK_VOID_COLS,
  FALLBACK_VOID_TYPE_COLS,
  FALLBACK_USERS_COLS,
} from './constants';
import { num, int, monthBounds, parseTSV, type TsvRow } from './parseUtils';
import { loadColumns as loadColumnsImpl } from './schemaLoader';
import { openBackup } from './backupReader';
import { findMostRecentMonth } from './findMostRecentMonth';

export type LogType = 'info' | 'success' | 'warn' | 'error' | 'section';
export type LogFn = (msg: string, type?: LogType) => void;
export type ProgressFn = (pct: number) => void;

export interface StoreRunInput {
  code: string;
  name: string;
  /** Supabase locations.id (UUID) — NOT the PawnMate-internal numeric id. */
  location_id: string | null;
}

interface StoreRun extends StoreRunInput {
  /** PawnMate's own internal location id, matched from the backup's locations.txt. */
  filterLocId: number | null;
}

export type MonthSelection =
  | { mode: 'manual'; months: { year: number; month: number }[] }
  | { mode: 'mostRecent' };

export interface ExtractedKpiRow {
  year: number;
  month: number;
  category: string;
  field_name: string;
  field_label: string;
  field_value: string | number;
  /** Supabase locations.id (UUID), already resolved for this store. */
  location_id: string | null;
  store_code: string;
  store_name: string;
  currency: string;
}

export interface ExtractOptions {
  file: File;
  password?: string;
  userId: string;
  userEmail: string | null;
  /** profiles.group — defaults to 0 ("Demo") if not set, matching getGroupLabel's convention. */
  group: number | null;
  storeRuns: StoreRunInput[];
  monthSelection: MonthSelection;
  tzOffsetHours: number;
  currency: string;
  /** 'YYYY-MM-DD' — customers before this date are excluded from new-customer counts. */
  goLiveDate?: string;
  wholesaleCids?: string[];
  onLog: LogFn;
  onProgress: ProgressFn;
}

export interface ExtractResult {
  rows: ExtractedKpiRow[];
  resolvedMonths: { year: number; month: number }[];
}

export async function extractKpiData(opts: ExtractOptions): Promise<ExtractResult> {
  const { file: zipFile, password, userId, userEmail, tzOffsetHours, onLog, onProgress } = opts;

  // ── Shims for identifiers the original script read from globals/DOM ──
  const user = { user_id: userId, user_email: userEmail };
  const group = opts.group ?? 0;
  const GROUP_LABELS: Record<number, string> = { 1: 'Founders' };
  const selectedCurrency = opts.currency;
  const wholesaleCids = new Set(opts.wholesaleCids ?? []);

  let goLiveTs = 0;
  if (opts.goLiveDate) {
    const [gly, glm, gld] = opts.goLiveDate.split('-').map(Number);
    goLiveTs = Date.UTC(gly, glm - 1, gld) / 1000 + Math.round(tzOffsetHours * 3600);
  }

  const storeRuns: StoreRun[] = opts.storeRuns.map((s) => ({ ...s, filterLocId: null }));

  let monthList: { year: number; month: number }[] =
    opts.monthSelection.mode === 'manual' ? opts.monthSelection.months : [];

  function loadColumns(tableBase: string, fallbackCols: string[]): Promise<string[]> {
    return loadColumnsImpl(tableBase, fallbackCols, loadSqlText, onLog);
  }

    const backup = await openBackup(zipFile, password, onLog);
    onProgress(8);

    for (const sr of storeRuns) {
      if (backup.isMultiStore) {
        const storeIndex = storeRuns.findIndex(s => s.code === sr.code);
        // Prefer matching the locations.txt row to this store by NAME
        // (short_name / name), not by array position — position only holds
        // if locations.txt happens to be ordered the same way as the
        // hardcoded USERS list, which is not guaranteed.
        let matched = null;
        if (backup.locations.length > 0) {
          const target = (sr.name || '').toLowerCase().trim();
          matched = backup.locations.find(l => {
            const shortName = (l.short_name || '').toLowerCase().trim();
            const name = (l.name || '').toLowerCase().trim();
            return shortName === target || name === target || shortName.includes(target) || target.includes(shortName);
          }) || null;
        }
        if (!matched && backup.locations.length > 0 && storeIndex >= 0) {
          matched = backup.locations[storeIndex] || null;
          if (matched) onLog(`  ⚠ ${sr.code}: no name match in locations.txt — falling back to positional match (index ${storeIndex})`, 'warn');
        }
        if (matched) {
          sr.filterLocId = int(matched.location_id);
          onLog(`  ${sr.code} → location_id=${sr.filterLocId} (${sr.name})`, 'success');
        }
        if (sr.filterLocId == null) {
          sr.filterLocId = storeRuns.indexOf(sr) + 1;
          onLog(`  ⚠ Could not map ${sr.code} to location_id — using ${sr.filterLocId}`, 'warn');
        }
      } else {
        sr.filterLocId = null;
      }
    }

    onLog('► Loading tables...', 'section');

    async function load(name) {
      const result = backup.loadTable(name);
      const text = (result instanceof Promise) ? await result : result;
      if (!text) onLog(`  ⚠ ${name} not found`, 'warn');
      return text || '';
    }

    // Loads a .sql schema file without the "not found" warning (loadColumns
    // below handles its own, more specific messaging).
    async function loadSqlText(name) {
      const result = backup.loadTable(name);
      const text = (result instanceof Promise) ? await result : result;
      return text || '';
    }

    const [pawnTxt, extensionTxt, buyinTxt, tdTxt, tTxt, soTxt, sodTxt,
           layTxt, scrapTxt, invTxt, invValTxt, ptTxt, pawnStatusTxt,
           pickedUpTxt, pbavTxt, repairPayTxt, invStockTxt, voidTxt,
           voidTypesTxt, usersTxt] = await Promise.all([
      load('pawn.txt'), load('extension.txt'), load('buyin.txt'),
      load('transactions_details.txt'), load('transactions.txt'),
      load('sales_order.txt'), load('sales_order_details.txt'),
      load('layaway.txt'), load('scrap_details.txt'),
      load('inventory.txt'), load('inventory_value.txt'),
      load('options_product_types.txt'), load('pawn_buyin_status.txt'),
      load('picked_up.txt'), load('pawn_buyin_active_values.txt'),
      load('repair_payments.txt'), load('inventory_stock.txt'), load('void_transaction_log.txt'),
      load('options_void_types.txt'), load('users.txt'),
    ]);
    onProgress(22);
    onLog('  All tables loaded', 'success');

    // ── DYNAMIC SCHEMA (column order) FROM EACH TABLE'S OWN .sql FILE ──
    // PawnMate periodically adds columns to its tables (e.g. round_layaway_pmt_up
    // was added to sales_order, rfid_tag/rfid_print_serial to inventory, in a
    // mid-2026 update). A hardcoded column-position list silently breaks — every
    // field after an insertion point reads the wrong data with no error — the
    // moment PawnMate ships a schema change. Every backup ships a matching .sql
    // schema dump alongside each .txt data file, so we parse the authoritative
    // column order from CREATE TABLE directly instead of trusting a fixed list.
    // The hardcoded FALLBACK_* lists below are used only if a .sql file is
    // missing or fails to parse.


    onLog('► Reading table schemas (.sql) from backup...', 'section');
    const [PAWN_COLS, EXT_COLS, BUYIN_COLS, TD_COLS, T_COLS, SO_COLS, SOD_COLS,
           LAY_COLS, SCRAP_COLS, PICKED_UP_COLS, PBAV_COLS, INV_COLS, INVVAL_COLS,
           PT_COLS, REPAIR_PAY_COLS, INVSTOCK_COLS, VOID_COLS, VOID_TYPE_COLS, USERS_COLS] = await Promise.all([
      loadColumns('pawn', FALLBACK_PAWN_COLS),
      loadColumns('extension', FALLBACK_EXT_COLS),
      loadColumns('buyin', FALLBACK_BUYIN_COLS),
      loadColumns('transactions_details', FALLBACK_TD_COLS),
      loadColumns('transactions', FALLBACK_T_COLS),
      loadColumns('sales_order', FALLBACK_SO_COLS),
      loadColumns('sales_order_details', FALLBACK_SOD_COLS),
      loadColumns('layaway', FALLBACK_LAY_COLS),
      loadColumns('scrap_details', FALLBACK_SCRAP_COLS),
      loadColumns('picked_up', FALLBACK_PICKED_UP_COLS),
      loadColumns('pawn_buyin_active_values', FALLBACK_PBAV_COLS),
      loadColumns('inventory', FALLBACK_INV_COLS),
      loadColumns('inventory_value', FALLBACK_INVVAL_COLS),
      loadColumns('options_product_types', FALLBACK_PT_COLS),
      loadColumns('repair_payments', FALLBACK_REPAIR_PAY_COLS),
      loadColumns('inventory_stock', FALLBACK_INVSTOCK_COLS),
      loadColumns('void_transaction_log', FALLBACK_VOID_COLS),
      loadColumns('options_void_types', FALLBACK_VOID_TYPE_COLS),
      loadColumns('users', FALLBACK_USERS_COLS),
    ]);
    onLog('  Schemas resolved', 'success');

    onLog('► Parsing tables...', 'section');

    const allPawns   = parseTSV(pawnTxt,    PAWN_COLS);
    const allExts    = parseTSV(extensionTxt,EXT_COLS);
    const allBuyins  = parseTSV(buyinTxt,   BUYIN_COLS);
    const tds        = parseTSV(tdTxt,      TD_COLS);
    const allTxns    = parseTSV(tTxt,       T_COLS);
    const allSos     = parseTSV(soTxt,      SO_COLS);
    const sods       = parseTSV(sodTxt,     SOD_COLS);
    const lays       = parseTSV(layTxt,     LAY_COLS);
    const allScraps  = parseTSV(scrapTxt,   SCRAP_COLS);
    const invItems   = parseTSV(invTxt,     INV_COLS);
    const allInvVals = parseTSV(invValTxt,  INVVAL_COLS);
    const ptRows     = parseTSV(ptTxt,      PT_COLS);
    const allPickedUps = parseTSV(pickedUpTxt, PICKED_UP_COLS);
    const allPbav    = parseTSV(pbavTxt,    PBAV_COLS);
    const allRepairPay = parseTSV(repairPayTxt, REPAIR_PAY_COLS);
    const allInvStock  = parseTSV(invStockTxt, INVSTOCK_COLS);
    // void_transaction_log has a handful of malformed/orphaned export rows
    // (just a tab + timestamp, no void_id) — drop anything that doesn't parse
    // as a valid row before use, per the void-data extraction notes.
    const allVoidsRaw = parseTSV(voidTxt, VOID_COLS);
    const allVoids = allVoidsRaw.filter(r => int(r.void_id) > 0 && int(r.void_type_id) > 0);
    if (allVoidsRaw.length !== allVoids.length) {
      onLog(`  ⚠ Dropped ${allVoidsRaw.length - allVoids.length} malformed void_transaction_log row(s) (missing void_id/void_type_id)`, 'warn');
    }
    const allVoidTypes = parseTSV(voidTypesTxt, VOID_TYPE_COLS);
    const allUsers      = parseTSV(usersTxt, USERS_COLS);
    onProgress(36);
    onLog('  Tables parsed', 'success');

    // ── "Most current month" auto-detection ──
    if (opts.monthSelection.mode === 'mostRecent') {
      const detected = findMostRecentMonth({ allInvVals, allSos, allPawns, allTxns }, tzOffsetHours);
      if (!detected) {
        throw new Error(
          'Could not detect the most recent month in this backup — please select month(s) manually instead.',
        );
      }
      monthList = [detected];
      const usedFallback = !allInvVals.some((r) => int(r.timestamp) > 0);
      onLog(
        `► Most current month detected: ${detected.year}-${String(detected.month).padStart(2, '0')}` +
          (usedFallback
            ? ' (based on latest transaction activity — inventory_value snapshots were unavailable to confirm the month fully closed out)'
            : ' (confirmed closed out by an inventory_value snapshot at or after month-end)'),
        'section',
      );
    }
    if (monthList.length === 0) {
      throw new Error('No month selected.');
    }


    // ── Parse pawn_buyin_status ──
    const OPEN_STATUSES    = new Set();
    const EXPIRED_STATUSES = new Set();
    const CLOSED_DISPOSITIONS = new Set(['pickup','sold','written_off','cancelled','void','buy_back']);
    if (pawnStatusTxt) {
      for (const line of pawnStatusTxt.split('\n')) {
        if (!line.trim()) continue;
        const cols = line.split('\t');
        if (cols.length < 7) continue;
        const statusId    = int(cols[0]);
        const pawnTypeId  = cols[3] === '\\N' ? null : int(cols[3]);
        const disposition = (cols[4] || '').trim().toLowerCase();
        const activeFlag  = cols[6] && cols[6].charCodeAt(0) === 1;
        if (pawnTypeId !== 1) continue;
        if (activeFlag) {
          OPEN_STATUSES.add(statusId);
        } else if (!CLOSED_DISPOSITIONS.has(disposition)) {
          EXPIRED_STATUSES.add(statusId);
        }
      }
    } else {
      [1, 8, 10, 20].forEach(s => OPEN_STATUSES.add(s));
      [2, 9, 11].forEach(s => EXPIRED_STATUSES.add(s));
    }
    const TERMINAL_STATUSES = new Set([...EXPIRED_STATUSES, 5, 6, 7, 12]);
    onLog(`  Status sets — open:{${[...OPEN_STATUSES].sort().join(',')}} expired:{${[...EXPIRED_STATUSES].sort().join(',')}}`, 'success');

    onLog('► Building shared lookups...', 'section');

    const ptParent = {};
    const ptName   = {};
    ptRows.forEach(r => {
      ptParent[r.product_type_id] = r.parent_id;
      ptName[r.product_type_id]   = r.product_name;
    });

    function getRootId(pid) {
      let depth=0, cur=pid;
      while (depth<15) {
        const p = ptParent[cur];
        if (!p || p==='0' || p===cur || p===null) return cur;
        cur=p; depth++;
      }
      return cur;
    }

    const dynamicRootToCat = {};
    const unmappedRoots = [];
    ptRows.forEach(r => {
      const pid = r.product_type_id;
      const par = ptParent[pid];
      const isRoot = !par || par==='0' || par===pid || par===null;
      if (isRoot) {
        const normalized = normalizeCatName(r.product_name);
        const cat = NAME_TO_CAT[normalized];
        if (cat) {
          dynamicRootToCat[pid] = cat;
        } else {
          dynamicRootToCat[pid] = 'OTHER';
          if (r.product_name && r.product_name.trim()) {
            unmappedRoots.push(`${r.product_name} (id=${pid})`);
          }
        }
      }
    });

    if (unmappedRoots.length > 0) {
      onLog(`  ⚠ Unmapped root categories → OTHER: ${unmappedRoots.join(', ')}`, 'warn');
    }

    const ptCatLookup = {};
    ptRows.forEach(r => {
      const id = r.product_type_id;
      ptCatLookup[id] = CHILD_OVERRIDES[id] || dynamicRootToCat[getRootId(id)] || 'OTHER';
    });

    interface FloorInvRawItem {
      sp: number;
      cogs: number;
      sellableDate: number;
      category: string;
      id: string | null;
      description: string;
    }
    interface FloorInvItem {
      value: number;
      sellingPrice: number;
      cogs: number;
      sellableDate: number;
      category: string;
      description: string;
    }

    const floorInvRaw: FloorInvRawItem[] = [];
    invItems.forEach(r => {
      if (r.void === '1') return;
      if (r.sellable !== '1' || r.priced_out !== '1') return;
      if (r.scrap_bin_id !== '0') return;
      const cat         = ptCatLookup[r.product_type_id] || 'OTHER';
      const sellableDate = int(r.original_sellable_date) || int(r.date_added);
      const sp          = num(r.selling_price);
      const cogs        = num(r.total_cost_of_goods);
      const description = ((r.description || r.make || r.model || 'Unknown item') + '').trim() || 'Unknown item';
      floorInvRaw.push({ sp, cogs, sellableDate, category: cat, id: r.inventory_id, description });
    });

    const spPopulated = floorInvRaw.filter(r => r.sp > 0).length;
    const useSellingPrice = spPopulated / Math.max(floorInvRaw.length, 1) >= 0.5;
    if (!useSellingPrice) {
      onLog('  ⚠ selling_price unpopulated for majority of floor items — falling back to COGS for aging', 'warn');
    } else {
      onLog(`  ✓ Aging value: selling_price (${spPopulated.toLocaleString()}/${floorInvRaw.length.toLocaleString()} items populated)`);
    }

    const floorInv: Record<string, FloorInvItem> = {};
    floorInvRaw.forEach(r => {
      if (r.id === null) return;
      floorInv[r.id] = {
        value:        useSellingPrice ? r.sp : r.cogs,
        sellingPrice: r.sp,
        cogs:         r.cogs,
        sellableDate: r.sellableDate,
        category:     r.category,
        description:  r.description,
      };
    });

    const sodCogsMap = {};
    sods.forEach(r => {
      if (!sodCogsMap[r.sales_order_id]) sodCogsMap[r.sales_order_id] = 0;
      sodCogsMap[r.sales_order_id] += num(r.cost_of_goods);
    });

    // inventory_id → category, for the Category column on the Top 20 report.
    const invCatInfo = {};
    invItems.forEach(r => {
      invCatInfo[r.inventory_id] = ptCatLookup[r.product_type_id] || 'OTHER';
    });

    // inventory_id → location_id. inventory.txt itself carries no location_id —
    // inventory_stock.txt is PawnMate's own current-stock-by-location table
    // ("tracks the current inventory qty available for sale by location" per its
    // own schema comment). A handful of items (recently transferred between
    // stores) show rows for more than one location; when that happens we prefer
    // whichever row is in inventory_state_id=1 ("On Hand") as the item's current
    // store, falling back to the first row seen otherwise.
    const invLocationId = {};
    const invLocationIsOnHand = {};
    allInvStock.forEach(r => {
      const isOnHand = r.inventory_state_id === '1';
      if (invLocationId[r.inventory_id] === undefined || (isOnHand && !invLocationIsOnHand[r.inventory_id])) {
        invLocationId[r.inventory_id] = r.location_id;
        invLocationIsOnHand[r.inventory_id] = isOnHand;
      }
    });

    // sales_order_id → array of its detail (line-item) rows, for the
    // Top/Bottom Sold Items report below.
    const sodsBySoId = {};
    sods.forEach(r => {
      if (!sodsBySoId[r.sales_order_id]) sodsBySoId[r.sales_order_id] = [];
      sodsBySoId[r.sales_order_id].push(r);
    });

    // pawn_id → original_principal — used for Redeems $ (joined from picked_up.txt).
    // Built from the full unfiltered pawn table to avoid silent cross-store join failures.
    const pawnPrincipalById = {};
    allPawns.forEach(p => { pawnPrincipalById[p.pawn_id] = num(p.original_principal); });

    // void_type_id → human label (e.g. 1 → "pawn"), from options_void_types.txt.
    const voidTypeLabel = {};
    allVoidTypes.forEach(r => { voidTypeLabel[r.void_type_id] = r.void_type || `type_${r.void_type_id}`; });

    // employee_id → is this a shared per-terminal void login rather than a real
    // staff member? PawnMate has no dedicated flag for this — user_status and
    // username are inconsistently populated for genuine employees too, so a
    // real name isn't reliable proof either way. What IS reliable: generic till
    // accounts are named things like "Void Till 1" / "MURRAY VOID" — a
    // whole-word match on void/till in the combined name catches these
    // cleanly with no false positives against real first/last names.
    const genericTillUserIds = new Set();
    allUsers.forEach(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      if (/\b(void|till)\b/i.test(fullName)) genericTillUserIds.add(u.user_id);
    });
    if (genericTillUserIds.size) {
      onLog(`  Flagged ${genericTillUserIds.size} generic till/void user account(s) — voids under these are not attributable to an individual employee`);
    }

    // void_comment keyword scan for interest/payment waivers — this never
    // shows up in a numeric field, only in staff-entered free text on an
    // otherwise ordinary void (e.g. a normal redeem void commented "WAIVING A
    // PAYMENT"). No controlled vocabulary exists, so this is a best-effort flag.
    const WAIVER_KEYWORD_RE = /\b(WAIV|COMP|FREE)/i;

    onProgress(44);
    onLog('  Shared lookups built', 'success');

    const custFirstTxnAnywhere: Record<string, number> = {};
    const custFirstTxnByLoc: Record<string, Record<string, number>> = {};
    function registerFirstTxn(cid, ts, locId) {
      if (!cid || wholesaleCids.has(cid)) return;
      if (custFirstTxnAnywhere[cid] === undefined || ts < custFirstTxnAnywhere[cid]) {
        custFirstTxnAnywhere[cid] = ts;
      }
      if (!custFirstTxnByLoc[cid]) custFirstTxnByLoc[cid] = {};
      if (custFirstTxnByLoc[cid][locId] === undefined || ts < custFirstTxnByLoc[cid][locId]) {
        custFirstTxnByLoc[cid][locId] = ts;
      }
    }
    allPawns.forEach(r => { if (r.void!=='1') registerFirstTxn(r.cid, int(r.created_date), r.location_id); });
    allBuyins.forEach(r => { if (r.void!=='1') registerFirstTxn(r.cid, int(r.order_date), r.location_id); });
    allSos.forEach(r => { if (r.void!=='1') registerFirstTxn(r.cid, int(r.created_date), r.location_id); });

    const allRows        = [];
    const topItemsRows   = [];
    const slowMoversRows = [];
    const totalStores = storeRuns.length;
    const totalMonths = monthList.length;

    for (let si = 0; si < totalStores; si++) {
      const sr = storeRuns[si];
      onLog(`► Store ${si+1}/${totalStores}: ${sr.code} — ${sr.name}`, 'section');

      const locStr  = sr.filterLocId !== null ? String(sr.filterLocId) : null;
      const lPawns  = locStr ? allPawns.filter(r  => r.location_id === locStr) : allPawns;
      const lExts   = locStr ? allExts.filter(r   => r.location_id === locStr) : allExts;
      const lBuyins = locStr ? allBuyins.filter(r  => r.location_id === locStr) : allBuyins;
      const lTxns   = locStr ? allTxns.filter(r   => r.location_id === locStr) : allTxns;
      const lSos    = locStr ? allSos.filter(r    => r.location_id === locStr) : allSos;
      const lScraps = locStr ? allScraps.filter(r  => r.location_id === locStr) : allScraps;
      const lInvVals= locStr ? allInvVals.filter(r => r.location_id === locStr) : allInvVals;
      const lPickedUps = locStr ? allPickedUps.filter(r => r.location_id === locStr) : allPickedUps;
      const lPbav      = locStr ? allPbav.filter(r => r.location_id === locStr) : allPbav;
      const lRepairPay = locStr ? allRepairPay.filter(r => r.location_id === locStr) : allRepairPay;
      const lVoids = locStr ? allVoids.filter(r => r.location_id === locStr) : allVoids;

      if (locStr) onLog(`  Rows — pawns:${lPawns.length} exts:${lExts.length} buyins:${lBuyins.length} txns:${lTxns.length} sos:${lSos.length}`);

      const txnMap = {};
      lTxns.forEach(r => { txnMap[r.transaction_id] = { ts: int(r.timestamp) }; });

      const locSoIds = new Set(lSos.map(s => s.sales_order_id));

      const custFirstTxnHere: Record<string, number> = {};
      Object.entries(custFirstTxnByLoc).forEach(([cid, byLoc]) => {
        if (locStr !== null) {
          if (byLoc[locStr] !== undefined) custFirstTxnHere[cid] = byLoc[locStr];
        } else {
          const tsVals = Object.values(byLoc);
          if (tsVals.length) custFirstTxnHere[cid] = Math.min(...tsVals);
        }
      });

      for (let mi = 0; mi < totalMonths; mi++) {
        const { year, month } = monthList[mi];
        const { start, end } = monthBounds(year, month, tzOffsetHours);
        onLog(`  ${year}-${String(month).padStart(2,'0')}...`);

        function row(category, field_name, field_label, field_value) {
          allRows.push({
            user_id:user.user_id, user_email:user.user_email, group, group_label: GROUP_LABELS[group] || `Group ${group}`,
            year, month, category, field_name, field_label,
            field_value: typeof field_value==='number' ? Math.round(field_value*100)/100 : field_value,
            location_id:sr.location_id, store_code:sr.code, store_name:sr.name, currency:selectedCurrency,
          });
        }

        // ── PAWN ──
        const pawnsWritten = lPawns.filter(p => int(p.created_date)>=start && int(p.created_date)<end && p.void!=='1' && !wholesaleCids.has(p.cid));
        row('pawn','num_pawns_written','# Pawns Written', pawnsWritten.length);
        // dollar_pawns_written: face value handed to customer at origination (sub_total).
        // This matches the PawnMate dashboard figure. Note: original_principal diverges from
        // sub_total on loans where the customer later made principal payments, because
        // PawnMate writes back to original_principal as those events occur.
        row('pawn','dollar_pawns_written','$ Pawns Written', pawnsWritten.reduce((s,p)=>s+num(p.sub_total),0));
        // dollar_pawns_written_adj: sum of original_principal for loans written this month.
        // Reflects adjusted/current principal (reduced by post-origination principal payments).
        // Kept as a separate field for reference; does NOT match the dashboard total.
        row('pawn','dollar_pawns_written_adj','$ Pawns Written (Adj. Principal)', pawnsWritten.reduce((s,p)=>s+num(p.original_principal),0));

        const pbavPawn = lPbav.filter(r => int(r.timestamp)<end && OPEN_STATUSES.has(int(r.pawn_buyin_status_id)));
        pbavPawn.sort((a,b)=>int(a.timestamp)-int(b.timestamp));
        let activePawnCountStamped = 0, pawnBalStamped = 0;
        if (pbavPawn.length) {
          const lastTs = int(pbavPawn[pbavPawn.length-1].timestamp);
          const lastBatch = pbavPawn.filter(r => int(r.timestamp) === lastTs);
          activePawnCountStamped = lastBatch.reduce((s,r)=>s+num(r.count),0);
          pawnBalStamped = lastBatch.reduce((s,r)=>s+num(r.value),0);
        }
        row('pawn','num_active_pawns','# Active Pawns', activePawnCountStamped);
        row('pawn','ending_pawn_balance','Ending Pawn Balance', pawnBalStamped);

        // ── PAWN BALANCE BREAKDOWN ──
        const PBB_BUCKETS = [
          { key:'0_100',      label:'$0 – $100',       lo:0,    hi:100    },
          { key:'100_250',    label:'$100 – $250',     lo:100,  hi:250    },
          { key:'251_500',    label:'$251 – $500',     lo:250,  hi:500    },
          { key:'501_1000',   label:'$501 – $1,000',   lo:500,  hi:1000   },
          { key:'1001_2500',  label:'$1,001 – $2,500', lo:1000, hi:2500   },
          { key:'2501_5000',  label:'$2,501 – $5,000', lo:2500, hi:5000   },
          { key:'5001_plus',  label:'$5,001+',         lo:5000, hi:Infinity},
        ];
        const pbbRawQty = {}; PBB_BUCKETS.forEach(b => { pbbRawQty[b.key] = 0; });
        const pbbDollar = {}; PBB_BUCKETS.forEach(b => { pbbDollar[b.key] = 0; });

        let pbbRawTotal = 0;
        lPawns.forEach(p => {
          if (p.void === '1') return;
          const sid = int(p.pawn_buyin_status_id);
          if (sid === 13) return;
          if (TERMINAL_STATUSES.has(sid)) {
            const disp = int(p.disposition_date);
            if (disp > 0 && disp < end) return;
          }
          const created = int(p.created_date);
          if (created >= end) return;
          const principal = num(p.current_principal);
          if (principal >= PLACEHOLDER_THRESHOLD) return;
          for (const b of PBB_BUCKETS) {
            if (principal > b.lo && principal <= b.hi) {
              pbbRawQty[b.key] += 1;
              pbbDollar[b.key] += principal;
              pbbRawTotal += 1;
              break;
            }
          }
        });

        const pbavPawnForPBB = lPbav.filter(r => int(r.timestamp)<end && OPEN_STATUSES.has(int(r.pawn_buyin_status_id)));
        pbavPawnForPBB.sort((a,b)=>int(a.timestamp)-int(b.timestamp));
        let pbbStampedCount = pbbRawTotal;
        if (pbavPawnForPBB.length) {
          const lastTs = int(pbavPawnForPBB[pbavPawnForPBB.length-1].timestamp);
          pbbStampedCount = pbavPawnForPBB.filter(r => int(r.timestamp)===lastTs).reduce((s,r)=>s+num(r.count),0);
        }

        const pbbQty = {};
        PBB_BUCKETS.forEach(b => {
          pbbQty[b.key] = pbbRawTotal > 0
            ? Math.round(pbbStampedCount * pbbRawQty[b.key] / pbbRawTotal)
            : 0;
        });

        PBB_BUCKETS.forEach(b => {
          row('pawn_balance_breakdown', `pbb_qty_${b.key}`,   `PBB QTY ${b.label}`,   pbbQty[b.key]);
          row('pawn_balance_breakdown', `pbb_dollar_${b.key}`,`PBB $ ${b.label}`,     pbbDollar[b.key]);
        });

        // Defaults (Pulled Pawns): sourced from inventory_value.pull_pawn_count /
        // pull_pawn_total (daily activity snapshots), NOT pawn.txt status=2.
        // pawn.txt status=2 counts loans that have expired — a different concept from items
        // physically pulled from non-sellable pawn inventory, which is what the dashboard
        // "Pulled Pawns" metric tracks. Each daily snapshot records the PREVIOUS business
        // day's activity (snapshot runs at ~08:05 UTC). The correct monthly window shifts
        // forward by +9h: [start+9h, end+9h) skips the month-opening snapshot (which holds
        // the prior month's last day) and includes the first snapshot of next month (which
        // holds this month's last day — e.g. June 1 snapshot = May 31 activity).
        const PULL_OFFSET_S = 9 * 3600;
        const pullSnaps = lInvVals.filter(r =>
          int(r.timestamp) >= start + PULL_OFFSET_S &&
          int(r.timestamp) <  end   + PULL_OFFSET_S
        );
        row('pawn','num_pawns_defaulted', '# Pawns Defaulted',  pullSnaps.reduce((s,r)=>s+num(r.pull_pawn_count),0));
        row('pawn','dollar_pawns_defaulted','$ Pawns Defaulted', pullSnaps.reduce((s,r)=>s+num(r.pull_pawn_total),0));

        const extMonth = lExts.filter(e => int(e.extension_date)>=start && int(e.extension_date)<end && e.void!=='1' && !wholesaleCids.has(e.cid));
        const pickedUpMonth = lPickedUps.filter(pu => int(pu.picked_up_date)>=start && int(pu.picked_up_date)<end && !wholesaleCids.has(pu.cid));
        const extPSC = extMonth.reduce((s,e)=>s+num(e.extension_pay),0) + pickedUpMonth.reduce((s,pu)=>s+num(pu.interest_paid),0);
        row('pawn','psc_collected','PSC Collected', extPSC);
        row('pawn','num_pawns_renewed_30d','# Pawns Renewed', extMonth.length);
        row('pawn','dollar_pawns_renewed_30d','$ Pawns Renewed', extMonth.reduce((s,e)=>s+num(e.current_principal),0));

        const redeemsPrincipal = pickedUpMonth.reduce((s,pu)=> s + (pawnPrincipalById[pu.pawn_id] || 0), 0);
        const redeemsTotalPaid = pickedUpMonth.reduce((s,pu)=> s + num(pu.interest_paid) + (pawnPrincipalById[pu.pawn_id] || 0), 0);
        row('pawn','num_pawns_redeemed','# Pawns Redeemed', pickedUpMonth.length);
        row('pawn','dollar_pawns_redeemed','$ Pawns Redeemed', redeemsPrincipal);
        row('pawn','dollar_pawns_redeemed_total','$ Pawns Redeemed (Total Paid)', redeemsTotalPaid);

        // ── BUY ──
        // Sourced from transactions_details type=2, bucketed by parent transaction timestamp.
        // Counts customer SESSIONS (one record per visit) and CASH ACTUALLY PAID OUT —
        // matching the PawnMate dashboard "New Buys" figure. buyin.txt (one record per item,
        // sum of assigned item values) gives a larger count and dollar total and does NOT
        // match the dashboard.
        const buyTds = tds.filter(td =>
          td.transaction_type_id === '2' &&
          td.void !== '1' &&
          !wholesaleCids.has(td.cust_cid) &&
          txnMap[td.transaction_id] &&
          txnMap[td.transaction_id].ts >= start &&
          txnMap[td.transaction_id].ts < end
        );
        row('pawn','num_buys_30d','# Buys', buyTds.length);
        row('pawn','dollar_buys_30d','$ Buys', buyTds.reduce((s,td)=>s+num(td.amount),0));

        // ── RETAIL / SALES ──
        const retailSOs = lSos.filter(s => { const cd=int(s.created_date); return s.void!=='1' && s.layaway!=='1' && cd>=start && cd<end && !wholesaleCids.has(s.cid); });
        // Retail revenue: IV taxable_sales_value + non_taxable_sales_value (pre-tax, daily
        // activity sums with +9h window). grand_total from sales_order includes tax collected,
        // which is not store revenue. IV sums match the dashboard exactly.
        const ivActSnaps = lInvVals.filter(r =>
          int(r.timestamp) >= start + PULL_OFFSET_S &&
          int(r.timestamp) <  end   + PULL_OFFSET_S
        );
        const retailRevenue = ivActSnaps.reduce((s,r) => s + num(r.taxable_sales_value) + num(r.non_taxable_sales_value), 0);
        const retailCOGS    = retailSOs.reduce((s,o)=>s+(sodCogsMap[o.sales_order_id]||0),0);
        row('merchandise','retail_sales','Retail Sales', retailRevenue);
        row('merchandise','retail_cogs','Retail COGS', retailCOGS);

        // Online Sales: retailSOs already excludes voids/layaways/wholesale and is
        // bucketed to this month by created_date — filter to transaction_source=3
        // ("ecommerce" per sales_order/transactions schema comments, i.e. sold on
        // the website — see options_marketplaces / options_transaction_sources).
        // NOT the same as transaction_source=2 (mobile app / FastPawn loan
        // payments), which is not merchandise sold online. Reported pre-tax
        // (sub_total) to match Retail Sales above — this is a breakout of Retail
        // Sales by channel, not additive to Gross Sales (avoids double-counting).
        const onlineSOs     = retailSOs.filter(s => s.transaction_source === '3');
        const onlineRevenue = onlineSOs.reduce((s,o)=>s+num(o.sub_total),0);
        row('merchandise','online_sales','Online Sales', onlineRevenue);

        // Net Sales Tax: IV tax_liability (tax collected) less tax_refunds (tax
        // refunded on returns), same daily-activity snapshots and +9h window as
        // Retail Sales above so it reconciles to the same period. This is a
        // whole-store total across all channels (in-store + online), which is
        // what a state sales-tax return calls for.
        const netSalesTax = ivActSnaps.reduce((s,r) => s + num(r.tax_liability) - num(r.tax_refunds), 0);
        row('merchandise','net_sales_tax','Net Sales Tax', netSalesTax);

        // Tax Exempt Sales: the non_taxable_sales_value component already inside
        // Retail Sales above (Retail Sales = taxable_sales_value +
        // non_taxable_sales_value) — broken out here as its own line, not
        // additive. Taxable Sales alone = Retail Sales − Tax Exempt Sales.
        const taxExemptSales = ivActSnaps.reduce((s,r) => s + num(r.non_taxable_sales_value), 0);
        row('merchandise','tax_exempt_sales','Tax Exempt Sales', taxExemptSales);

        const completedLay = lSos.filter(s => {
          const lcd=int(s.layaway_completed_date);
          return s.void!=='1' && s.cancelled_layaway!=='1' && s.layaway==='1' && lcd>=start && lcd<end && !wholesaleCids.has(s.cid);
        });
        const layRevenue = completedLay.reduce((s,o)=>s+num(o.sub_total),0); // pre-tax; grand_total includes tax
        const layCOGS    = completedLay.reduce((s,o)=>s+(sodCogsMap[o.sales_order_id]||0),0);
        row('merchandise','dollar_redeemed_layaways','$ Redeemed Layaways', layRevenue);
        row('merchandise','layaway_cogs','Layaway COGS', layCOGS);
        row('merchandise','num_redeemed_layaways','# Redeemed Layaways', completedLay.length);

        const layPays = lays.filter(l => {
          const pd=int(l.payment_date);
          return l.void!=='1' && pd>=start && pd<end && locSoIds.has(l.sales_order_id);
        });
        row('merchandise','layaway_payments_collected','Layaway Payments Collected', layPays.reduce((s,l)=>s+num(l.payment),0));
        row('merchandise','num_layaway_payments_30d','# Layaway Payments', layPays.length);

        // Repair payments revenue: pre-tax (repair_payment - repair_payment_tax).
        // Matches dashboard 'Taxable + Non-Taxable Repair Payments' total.
        const repairMonth   = lRepairPay.filter(r => r.void!=='1' && int(r.timestamp)>=start && int(r.timestamp)<end);
        const repairRevenue = repairMonth.reduce((s,r) => s + num(r.repair_payment) - num(r.repair_payment_tax), 0);
        row('merchandise','repair_revenue','Repair Payments Revenue', repairRevenue);

        // Cancelled Payments Income: layaway_fee retained by store on cancelled layaways.
        // Sourced from lays.layaway_fee for payments in this month window.
        const cancelledIncome = layPays.reduce((s,l) => s + num(l.layaway_fee), 0);
        row('merchandise','cancelled_income','Cancelled Payments Income', cancelledIncome);

        const newLay = lSos.filter(s => { const cd=int(s.created_date); return s.void!=='1' && s.layaway==='1' && cd>=start && cd<end; });
        row('merchandise','num_new_layaways','# New Layaways Written', newLay.length);
        row('merchandise','dollar_new_layaways','$ New Layaways Written', newLay.reduce((s,o)=>s+num(o.original_layaway_balance),0));

        const activeLay = lSos.filter(s => {
          const cd=int(s.created_date), lcd=int(s.layaway_completed_date);
          return s.void!=='1' && s.cancelled_layaway!=='1' && s.layaway==='1' && s.active==='1' && cd<end && (lcd===0||lcd>=end);
        });
        const layBeforeEnd = lays.filter(l => l.void!=='1' && int(l.payment_date)<end && locSoIds.has(l.sales_order_id));
        const latestBalMap: Record<string, number> = {};
        layBeforeEnd.sort((a,b)=>int(a.payment_date)-int(b.payment_date)).forEach(l => { latestBalMap[l.sales_order_id]=num(l.current_balance); });
        const activeSoIds = new Set(activeLay.map(o=>o.sales_order_id));
        let layBal = 0;
        for (const [sid,bal] of Object.entries(latestBalMap)) { if (activeSoIds.has(sid)) layBal+=bal; }
        row('merchandise','layaway_balance','Layaway Balance', layBal);
        row('merchandise','num_active_layaways','# Active Layaways', activeLay.length);

        const scrapMonth = lScraps.filter(s => { const ts=int(s.sent_timestamp); return ts>=start && ts<end; });
        const scrapRevenue = scrapMonth.reduce((s,r)=>s+num(r.sold_amount),0);
        const scrapCOGS    = scrapMonth.reduce((s,r)=>s+num(r.sent_amount),0);
        row('merchandise','scrap_sales','Scrap Sales', scrapRevenue);
        row('merchandise','cogs_scrap','Scrap COGS',  scrapCOGS);

        // Gross Sales = retail (IV pre-tax) + layaway (sub_total) + repair + cancelled income.
        // Gross COGS  = retail COGS + layaway COGS (repair/cancelled have no COGS component).
        // Scrap tracked separately and excluded from gross totals.
        const grossRev  = retailRevenue + layRevenue + repairRevenue + cancelledIncome;
        const grossCOGS = retailCOGS + layCOGS;
        row('merchandise','gross_sales','Gross Sales', grossRev);
        row('merchandise','gross_cogs','Gross COGS',  grossCOGS);

        // ── TRANSACTION COUNTS ──
        const numPawnTxns  = pawnsWritten.length;
        const numSalesTxns = retailSOs.length + completedLay.length;
        const numBuyTxns   = buyTds.length;
        const numRenewals  = extMonth.length;
        const numRedeems   = pickedUpMonth.length;

        row('merchandise','num_pawn_transactions_30d','# Pawn Transactions',  numPawnTxns);
        row('merchandise','num_sales_transactions_30d','# Sales Transactions', numSalesTxns);
        row('merchandise','num_buy_transactions_30d','# Buy Transactions',    numBuyTxns);
        row('merchandise','num_pawn_renewals_30d','# Pawn Renewals',         numRenewals);
        row('merchandise','num_pawn_redeems_30d','# Pawn Redeems',           numRedeems);
        const total = numPawnTxns + numSalesTxns + numBuyTxns + layPays.length + numRenewals + numRedeems;
        row('merchandise','num_total_transactions_30d','# Total Transactions', total);

        // ── NEW CUSTOMERS ──
        const newCusts = Object.entries(custFirstTxnHere).filter(([cid, tsHere]) => {
          if (tsHere < start || tsHere >= end) return false;
          if (goLiveTs > 0 && tsHere < goLiveTs) return false;
          return true;
        }).length;
        row('marketing','new_customers_30d','New Customers', newCusts);

        // ── VOIDS ──
        const voidsMonth = lVoids.filter(v => { const ts = int(v.timestamp); return ts >= start && ts < end; });
        const voidsGross = voidsMonth.reduce((s,v) => s + Math.abs(num(v.void_amount)), 0);
        const voidsNet   = voidsMonth.reduce((s,v) => s + num(v.void_amount), 0);
        const voidsGenericTill = voidsMonth.filter(v => genericTillUserIds.has(v.employee_id)).length;
        const voidsFlaggedWaiver = voidsMonth.filter(v => WAIVER_KEYWORD_RE.test(v.void_comment || '')).length;
        row('voids','num_voids',               '# Voids',                        voidsMonth.length);
        row('voids','dollar_voids_gross',       '$ Voided (Gross/Abs)',           voidsGross);
        row('voids','dollar_voids_net',         '$ Voided (Net)',                 voidsNet);
        row('voids','num_voids_generic_till',   '# Voids — Generic Till Acct',    voidsGenericTill);
        row('voids','num_voids_flagged_waiver', '# Voids — Possible Waiver',      voidsFlaggedWaiver);

        // Breakdown by void type (pawn, buyin, extension, retail_sales, etc.),
        // labeled dynamically from options_void_types.txt rather than hardcoded.
        const voidsByType: Record<string, { count: number; gross: number }> = {};
        voidsMonth.forEach(v => {
          const label = voidTypeLabel[v.void_type_id] || `type_${v.void_type_id}`;
          if (!voidsByType[label]) voidsByType[label] = { count: 0, gross: 0 };
          voidsByType[label].count += 1;
          voidsByType[label].gross += Math.abs(num(v.void_amount));
        });
        Object.entries(voidsByType).forEach(([label, agg]) => {
          const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          row('voids', `num_voids_${slug}`,    `# Voids — ${label}`,       agg.count);
          row('voids', `dollar_voids_${slug}`, `$ Voided (Gross) — ${label}`, agg.gross);
        });

        // ── UNIQUE CUSTOMERS 30-DAY ──
        // Distinct CIDs (cid > 2) with a transaction in the reporting month window.
        const uniqueCusts30dSet = new Set();
        lTxns.forEach(r => {
          const ts = int(r.start_time), cid = r.cid;
          if (cid && int(cid) > 2 && ts >= start && ts < end) uniqueCusts30dSet.add(cid);
        });
        row('marketing','unique_customers_30d','Unique Customers (30-Day)', uniqueCusts30dSet.size);

        // ── UNIQUE CUSTOMERS 365-DAY & REPEAT CUSTOMERS 365-DAY ──
        // Trailing 365-day window: start of the month 12 months prior → end of reporting month.
        const yr365start = Date.UTC(year - 1, month - 1, 1) / 1000;
        const cidTouchCount: Record<string, number> = {};
        lTxns.forEach(r => {
          const ts = int(r.start_time), cid = r.cid;
          if (!cid || int(cid) <= 2 || ts < yr365start || ts >= end) return;
          cidTouchCount[cid] = (cidTouchCount[cid] || 0) + 1;
        });
        const uniqueCusts365d = Object.keys(cidTouchCount).length;
        const repeatCusts365d = Object.values(cidTouchCount).filter(n => n >= 2).length;
        row('marketing','unique_customers_365d','Unique Customers (365-Day)', uniqueCusts365d);
        row('marketing','repeat_customers_365d','Repeat Customers (365-Day)', repeatCusts365d);

        // ── ENDING INVENTORY ──
        // PawnMate's automated snapshot runs at ~08:05 UTC daily. The snapshot that captures
        // EOD activity for month M therefore runs on day 1 of month M+1 (e.g., the June 1
        // morning snapshot holds the final May 31 balances). Strategy: take the FIRST snapshot
        // at or after month-end within a 48h window; fall back to last pre-end stamp if the
        // backup doesn't extend far enough (e.g., mid-month backup).
        const INV_SNAP_WINDOW = 2 * 86400;
        let eomInvSnap = null;
        const invValPost = lInvVals.filter(r =>
          int(r.timestamp) >= end &&
          int(r.timestamp) < end + INV_SNAP_WINDOW &&
          num(r.sellable_value) < PLACEHOLDER_THRESHOLD
        );
        invValPost.sort((a,b) => int(a.timestamp) - int(b.timestamp));
        if (invValPost.length) {
          eomInvSnap = invValPost[0];
        } else {
          const invValPre = lInvVals.filter(r =>
            int(r.timestamp) < end && num(r.sellable_value) < PLACEHOLDER_THRESHOLD
          );
          invValPre.sort((a,b) => int(a.timestamp) - int(b.timestamp));
          eomInvSnap = invValPre.length ? invValPre[invValPre.length - 1] : null;
        }
        const invMerch   = eomInvSnap ? num(eomInvSnap.sellable_value)           : 0;
        const invScrap   = eomInvSnap ? num(eomInvSnap.scrap_bin_value)           : 0;
        const invBuyin   = eomInvSnap ? num(eomInvSnap.non_sellable_buyin_value)  : 0;
        // Layaway inventory = COGS of active layaway items where next_payment_date > end.
        // Matches dashboard 'Layaway Inventory' which excludes overdue/past-due layaways.
        // cur_layaway_balance from inventory_value represents outstanding customer balance
        // (what they owe) — not the store's cost basis, which is what is tracked here.
        const invLayaway = activeLay
          .filter(s => int(s.next_layaway_payment_date) > end)
          .reduce((s, o) => s + (sodCogsMap[o.sales_order_id] || 0), 0);
        const invTotal   = invMerch + invScrap + invBuyin + invLayaway;
        row('merchandise','ending_inventory',          'Ending Inventory',              invMerch);
        row('merchandise','ending_inventory_scrap',    'Ending Inventory — Scrap',      invScrap);
        row('merchandise','ending_inventory_buyin',    'Ending Inventory — Buy',        invBuyin);
        row('merchandise','ending_inventory_layaway',  'Ending Inventory — Layaway',    invLayaway);
        row('merchandise','ending_inventory_total',    'Ending Inventory — Total',      invTotal);

        // ── TOP 20 SOLD ITEMS BY $ REVENUE (item level) ──
        // "Sold" = sales_order created this month, not void, not a cancelled
        // layaway, not a wholesale CID — same population as Retail/Layaway
        // revenue above. Ranked at the individual line-item level (not
        // aggregated across sales) — a single line where qty>1 (e.g. 46 silver
        // eagles sold in one transaction) appears once with its full qty and
        // revenue; two separate sales of a similarly-described item appear as
        // two separate lines, matching how the business actually transacted.
        const soldSoIds = lSos.filter(s => {
          const cd = int(s.created_date);
          if (s.void === '1') return false;
          if (cd < start || cd >= end) return false;
          if (s.layaway === '1' && s.cancelled_layaway === '1') return false;
          if (wholesaleCids.has(s.cid)) return false;
          return true;
        }).map(s => s.sales_order_id);

        const soldLines = [];
        soldSoIds.forEach(soId => {
          const details = sodsBySoId[soId];
          if (!details) return;
          details.forEach(d => {
            if (d.returned_item === '1') return;
            const qtyOrdered = num(d.qty);
            const netQty = qtyOrdered - num(d.total_qty_returned);
            if (netQty <= 0) return;
            // sold_price / cost_of_goods are line-totals (not per-unit, consistent
            // with how cost_of_goods is used elsewhere in this extractor); scale
            // down proportionally for partial returns.
            const scale   = qtyOrdered > 0 ? netQty / qtyOrdered : 1;
            const revenue = num(d.sold_price) * scale;
            const cogs    = num(d.cost_of_goods) * scale;
            const category = invCatInfo[d.inventory_id] || 'UNCATEGORIZED';
            const item      = ((d.description || d.make || d.model || 'Unknown item') + '').trim() || 'Unknown item';
            soldLines.push({ item, category, revenue, cogs, qty: netQty });
          });
        });

        const top20 = soldLines.slice().sort((a,b) => b.revenue - a.revenue).slice(0, 20);
        top20.forEach((it, i) => {
          const rank = i + 1;
          const gp = it.revenue - it.cogs;
          const margin = it.revenue > 0 ? gp / it.revenue : 0;
          topItemsRows.push({
            store_code: sr.code, store_name: sr.name, year, month, rank,
            item: it.item, category: it.category, revenue: Math.round(it.revenue*100)/100,
            cogs: Math.round(it.cogs*100)/100, gp: Math.round(gp*100)/100, qty: it.qty,
            margin: Math.round(margin*10000)/10000,
          });
          row('top_items', `top_${rank}_item`,     `Top #${rank} Item`,          it.item);
          row('top_items', `top_${rank}_category`, `Top #${rank} Category`,      it.category);
          row('top_items', `top_${rank}_revenue`,  `Top #${rank} Revenue`,       it.revenue);
          row('top_items', `top_${rank}_cogs`,     `Top #${rank} COGS`,          it.cogs);
          row('top_items', `top_${rank}_gp`,       `Top #${rank} Gross Profit`,  gp);
          row('top_items', `top_${rank}_qty`,      `Top #${rank} Qty`,           it.qty);
          row('top_items', `top_${rank}_margin`,   `Top #${rank} Margin %`,      margin);
        });

        onProgress(44 + Math.round(55 * (si * totalMonths + mi + 1) / (totalStores * totalMonths)));
      }
    }

    // ── SLOWEST-MOVING FLOOR INVENTORY (item level, once per store) ──
    // inventory.txt reflects the floor as of the backup export, not a
    // reconstructable historical state per month — so unlike everything above,
    // this is computed once per store, "as of" the end of the last selected
    // month, rather than once per selected month.
    onLog('► Computing slowest-moving inventory (per store)...', 'section');
    {
      const lastMonth = monthList[monthList.length - 1];
      const { end: asOfEnd } = monthBounds(lastMonth.year, lastMonth.month, tzOffsetHours);
      let unmatchedCount = 0;
      storeRuns.forEach(sr => {
        const locStr = sr.filterLocId !== null ? String(sr.filterLocId) : null;
        const storeItems = Object.entries(floorInv)
          .filter(([invId]) => {
            if (locStr === null) return true;
            const loc = invLocationId[invId];
            if (loc === undefined) { unmatchedCount++; return false; }
            return loc === locStr;
          })
          .map(([, item]) => item)
          .filter(item => {
            if (item.sellableDate <= 0) return false;
            // Same 730-day cap used in the Inventory Aging sheet: ages beyond
            // this are treated as pre-migration/phantom timestamps rather than
            // genuine multi-year-old floor items (see Aging computation above).
            const ageDays = (asOfEnd - item.sellableDate) / 86400;
            return ageDays >= 0 && ageDays <= 730;
          });

        storeItems.sort((a, b) => a.sellableDate - b.sellableDate); // oldest first
        const slowest10 = storeItems.slice(0, 10);

        onLog(`  ${sr.code}: ${storeItems.length.toLocaleString()} floor items with a sellable date — 10 oldest selected`);

        slowest10.forEach((it, i) => {
          const rank = i + 1;
          const ageDays = Math.floor((asOfEnd - it.sellableDate) / 86400);
          slowMoversRows.push({
            store_code: sr.code, store_name: sr.name, as_of_year: lastMonth.year, as_of_month: lastMonth.month,
            rank, item: it.description, category: it.category, days_on_hand: ageDays,
            selling_price: Math.round(it.sellingPrice * 100) / 100, cogs: Math.round(it.cogs * 100) / 100,
          });
          const fields = [
            ['item', 'Item', it.description],
            ['category', 'Category', it.category],
            ['days_on_hand', 'Days on Hand', ageDays],
            ['selling_price', 'Selling Price', it.sellingPrice],
            ['cogs', 'COGS', it.cogs],
          ];
          fields.forEach(([fn, label, val]) => {
            allRows.push({
              user_id: user.user_id, user_email: user.user_email, group, group_label: GROUP_LABELS[group] || `Group ${group}`,
              year: lastMonth.year, month: lastMonth.month, category: 'slow_movers',
              field_name: `slowmover_${rank}_${fn}`, field_label: `Slowest #${rank} ${label}`,
              field_value: typeof val === 'number' ? Math.round(val * 100) / 100 : val,
              location_id: sr.location_id, store_code: sr.code, store_name: sr.name, currency: selectedCurrency,
            });
          });
        });
      });
      if (unmatchedCount > 0) {
        onLog(`  ⚠ ${unmatchedCount.toLocaleString()} floor item/store lookups had no inventory_stock.txt match and were excluded from slow-mover lists`, 'warn');
      }
    }

    // ── AGING ──
    onLog('► Computing inventory aging (combined)...', 'section');
    {
      const agingSr   = storeRuns[0];
      const agingCode = agingSr.code;
      const agingName = agingSr.name;

      for (let mi = 0; mi < totalMonths; mi++) {
        const { year, month } = monthList[mi];
        const { start, end } = monthBounds(year, month, tzOffsetHours);

        function agingRow(category, field_name, field_label, field_value) {
          allRows.push({
            user_id:user.user_id, user_email:user.user_email, group, group_label: GROUP_LABELS[group] || `Group ${group}`,
            year, month, category, field_name, field_label,
            field_value: typeof field_value==='number' ? Math.round(field_value*100)/100 : field_value,
            location_id:agingSr.location_id, store_code:agingCode, store_name:agingName, currency:selectedCurrency,
          });
        }

        // Aging stamped total: same post-month snapshot logic as ending_inventory —
        // first stamp at or after month end captures EOD state for the month.
        const ivSnapPost = allInvVals.filter(r =>
          int(r.timestamp) >= end &&
          int(r.timestamp) < end + 2*86400 &&
          num(r.sellable_value) < PLACEHOLDER_THRESHOLD
        );
        ivSnapPost.sort((a,b) => int(a.timestamp) - int(b.timestamp));
        const latestPerLoc: Record<string, TsvRow> = {};
        if (ivSnapPost.length) {
          ivSnapPost.forEach(r => { if (!latestPerLoc[r.location_id]) latestPerLoc[r.location_id] = r; });
        } else {
          const ivSnapPre = allInvVals.filter(r =>
            int(r.timestamp) < end && num(r.sellable_value) < PLACEHOLDER_THRESHOLD
          );
          ivSnapPre.sort((a,b) => int(a.timestamp) - int(b.timestamp));
          ivSnapPre.forEach(r => { latestPerLoc[r.location_id] = r; });
        }
        const combinedStamped = Object.values(latestPerLoc).reduce((s,r) => s + num(r.sellable_value), 0);

        const ALL_BKS = ['0_90','91_120','121_180','181_210','211_365','366_730'];
        const ageBuckets: Record<string, { dollar: number; qty: number }> = {};
        ALL_BKS.forEach(bk => { ageBuckets[bk] = {dollar:0, qty:0}; });
        const catBuckets: Record<string, Record<string, { dollar: number; qty: number }>> = {};

        for (const item of Object.values(floorInv)) {
          if (item.sellableDate === 0) continue;
          const ageDays = (end - item.sellableDate) / 86400;
          if (ageDays < 0 || ageDays > 730) continue;

          const bk = ageDays<=90   ? '0_90'
                   : ageDays<=120  ? '91_120'
                   : ageDays<=180  ? '121_180'
                   : ageDays<=210  ? '181_210'
                   : ageDays<=365  ? '211_365'
                   :                 '366_730';

          ageBuckets[bk].dollar += item.value;
          ageBuckets[bk].qty    += 1;

          const cat = item.category;
          if (!catBuckets[cat]) catBuckets[cat] = {};
          if (!catBuckets[cat][bk]) catBuckets[cat][bk] = {dollar:0, qty:0};
          catBuckets[cat][bk].dollar += item.value;
          catBuckets[cat][bk].qty    += 1;
        }

        const rawTotal = ALL_BKS.reduce((s,bk) => s + ageBuckets[bk].dollar, 0);
        const scaleFactor = (combinedStamped > 0 && rawTotal > 0) ? combinedStamped / rawTotal : 1;
        const valueLabel = useSellingPrice ? 'SP' : 'COGS';
        if (mi === 0) onLog(`  Scale (${year}-${String(month).padStart(2,'0')}): ${scaleFactor.toFixed(4)}× — stamped $${Math.round(combinedStamped).toLocaleString()} / raw ${valueLabel} $${Math.round(rawTotal).toLocaleString()}`);

        for (const bk of ALL_BKS) {
          agingRow('aged_inventory',`TOTAL_${bk}_dollar`,`TOTAL_${bk}_Dollar`, ageBuckets[bk].dollar * scaleFactor);
          agingRow('aged_inventory',`TOTAL_${bk}_qty`,   `TOTAL_${bk}_QTY`,   ageBuckets[bk].qty);
        }

        for (const cat of CATEGORIES_ORDERED) {
          if (cat==='TOTAL') continue;
          const catData = catBuckets[cat] || {};
          for (const bk of ALL_BKS) {
            const d = catData[bk] || {dollar:0, qty:0};
            agingRow('aged_inventory',`${cat}_${bk}_dollar`,`${cat}_${bk}_Dollar`, d.dollar * scaleFactor);
            agingRow('aged_inventory',`${cat}_${bk}_qty`,   `${cat}_${bk}_QTY`,   d.qty);
          }
        }
      }
    }

  return {
    rows: allRows,
    resolvedMonths: monthList,
  };
}
