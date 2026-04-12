/**
 * db/db.js — Dual-mode storage
 *
 * Web (npm run dev)     → IndexedDB via idb  (fast, zero setup)
 * Native (Android APK)  → SQLite via @capacitor-community/sqlite
 *
 * API surface is identical in both paths so nothing else needs to change.
 */

// ─── Platform detection ───────────────────────────────────────────────────────
function isNative() {
  return typeof window !== 'undefined' &&
    window.Capacitor != null &&
    window.Capacitor.isNativePlatform?.() === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEB PATH  — IndexedDB (idb)
// ═══════════════════════════════════════════════════════════════════════════════
let idbInstance = null;

async function getIDB() {
  if (idbInstance) return idbInstance;
  const { openDB } = await import('idb');
  idbInstance = await openDB('disaster-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'reportId' });
      }
    },
  });
  return idbInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NATIVE PATH — SQLite (@capacitor-community/sqlite)
// ═══════════════════════════════════════════════════════════════════════════════
let sqliteDb = null;

async function getSQLite() {
  if (sqliteDb) return sqliteDb;

  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection('disaster-db', false)).result;

  sqliteDb = isConn
    ? await sqlite.retrieveConnection('disaster-db', false)
    : await sqlite.createConnection('disaster-db', false, 'no-encryption', 1, false);

  await sqliteDb.open();
  await sqliteDb.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      reportId TEXT PRIMARY KEY NOT NULL,
      data     TEXT NOT NULL
    );
  `);
  return sqliteDb;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export async function initDB() {
  if (isNative()) {
    return await getSQLite();
  }
  return await getIDB();
}

export async function addReport(report) {
  if (isNative()) {
    const db = await getSQLite();
    await db.run(
      'INSERT OR REPLACE INTO reports (reportId, data) VALUES (?, ?)',
      [report.reportId, JSON.stringify(report)]
    );
  } else {
    const db = await getIDB();
    await db.put('reports', report);
  }
  return report;
}

export async function getReports() {
  if (isNative()) {
    const db = await getSQLite();
    const result = await db.query('SELECT data FROM reports');
    if (!result.values || result.values.length === 0) return [];
    return result.values.map(row => JSON.parse(row.data));
  } else {
    const db = await getIDB();
    return await db.getAll('reports');
  }
}

export async function updateReport(reportId, changes) {
  if (isNative()) {
    const db = await getSQLite();
    const existing = await db.query('SELECT data FROM reports WHERE reportId = ?', [reportId]);
    if (!existing.values || existing.values.length === 0) {
      throw new Error(`Report ${reportId} not found`);
    }
    const merged = { ...JSON.parse(existing.values[0].data), ...changes };
    await db.run(
      'INSERT OR REPLACE INTO reports (reportId, data) VALUES (?, ?)',
      [reportId, JSON.stringify(merged)]
    );
    return merged;
  } else {
    const db = await getIDB();
    const existing = await db.get('reports', reportId);
    if (!existing) throw new Error(`Report ${reportId} not found`);
    const merged = { ...existing, ...changes };
    await db.put('reports', merged);
    return merged;
  }
}

export async function deleteReport(reportId) {
  if (isNative()) {
    const db = await getSQLite();
    await db.run('DELETE FROM reports WHERE reportId = ?', [reportId]);
  } else {
    const db = await getIDB();
    await db.delete('reports', reportId);
  }
}
