import axios from 'axios';
import { getReports, updateReport, addReport } from '../db/db.js';
import { mergeField, mergeReport } from '../utils/mergeField.js';

async function performSync(url, timeoutConfig = 0) {
  try {
    const localReports = await getReports();
    
    const response = await axios.post(url, { reports: localReports }, {
      timeout: timeoutConfig,
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const serverReports = response.data.reports;
    
    for (const report of serverReports) {
      const existingLocal = localReports.find(r => r.reportId === report.reportId);
      
      if (existingLocal) {
        const mergedReport = mergeReport(existingLocal, report);
        await updateReport(report.reportId, mergedReport);
      } else {
        await addReport(report);
      }
    }
    
    return await getReports();
  } catch (error) {
    console.error(`Sync failed for ${url}:`, error);
    throw error;
  }
}


const BASE_URL = import.meta.env.VITE_SYNC_URL || 'http://localhost:3001';

export async function syncWithServer() {
  return await performSync(`${BASE_URL}/sync`);
}

export async function syncWithPeer(peerIp) {
  const cleanIp = peerIp.replace(/^https?:\/\//, '');
  const url = `http://${cleanIp}:3001/sync`;
  try {
    return await performSync(url, 5000);
  } catch (error) {
    console.error("Peer sync error:", error);
    throw new Error("Could not reach peer device");
  }
}

export function isOnline() {
  return navigator.onLine;
}
