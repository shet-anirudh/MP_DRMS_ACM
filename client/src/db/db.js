import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let dbInstance = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  
  try {
    const isConn = await sqlite.isConnection('disaster.db', false);
    if (isConn.result) {
      dbInstance = await sqlite.retrieveConnection('disaster.db', false);
    } else {
      dbInstance = await sqlite.createConnection('disaster.db', false, 'no-encryption', 1, false);
    }
    await dbInstance.open();

    const query = `
      CREATE TABLE IF NOT EXISTS reports (
        reportId TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `;
    await dbInstance.execute(query);
    return dbInstance;
  } catch (error) {
    dbInstance = null;
    throw new Error(`Failed to initialize SQLite: ${error.message}`);
  }
}

export async function addReport(report) {
  await initDB();
  const query = `INSERT OR REPLACE INTO reports (reportId, data) VALUES (?, ?)`;
  await dbInstance.run(query, [report.reportId, JSON.stringify(report)]);
  return report;
}

export async function getReports() {
  await initDB();
  const result = await dbInstance.query(`SELECT * FROM reports`);
  if (result.values && result.values.length > 0) {
    return result.values.map(row => JSON.parse(row.data));
  }
  return [];
}

export async function updateReport(reportId, changes) {
  await initDB();
  const result = await dbInstance.query(`SELECT * FROM reports WHERE reportId = ?`, [reportId]);
  
  if (!result.values || result.values.length === 0) {
    throw new Error(`Report with reportId ${reportId} not found`);
  }
  
  const existingReport = JSON.parse(result.values[0].data);
  const updatedReport = { ...existingReport, ...changes };
  
  const query = `INSERT OR REPLACE INTO reports (reportId, data) VALUES (?, ?)`;
  await dbInstance.run(query, [reportId, JSON.stringify(updatedReport)]);
  return updatedReport;
}

export async function deleteReport(reportId) {
  await initDB();
  await dbInstance.run(`DELETE FROM reports WHERE reportId = ?`, [reportId]);
}
