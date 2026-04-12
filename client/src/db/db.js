import { openDB } from 'idb';

let dbInstance = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  
  try {
    dbInstance = await openDB('disaster-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'reportId' });
        }
      },
    });
    return dbInstance;
  } catch (error) {
    dbInstance = null;
    throw new Error(`Failed to initialize IndexedDB: ${error.message}`);
  }
}

export async function addReport(report) {
  const db = await initDB();
  await db.put('reports', report);
  return report;
}

export async function getReports() {
  const db = await initDB();
  return await db.getAll('reports');
}

export async function updateReport(reportId, changes) {
  const db = await initDB();
  const existingReport = await db.get('reports', reportId);
  
  if (!existingReport) {
    throw new Error(`Report with reportId ${reportId} not found`);
  }
  
  const updatedReport = { ...existingReport, ...changes };
  await db.put('reports', updatedReport);
  return updatedReport;
}

export async function deleteReport(reportId) {
  const db = await initDB();
  await db.delete('reports', reportId);
}
