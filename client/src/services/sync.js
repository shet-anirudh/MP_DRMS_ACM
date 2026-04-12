import axios from 'axios';
import { getReports, updateReport, addReport } from '../db/db.js';

function mergeFieldClient(localField, serverField) {
  if (!localField) return serverField;
  if (!serverField) return localField;

  if (serverField.conflict && !localField.conflict) {
    const maxTs = Math.max(serverField.versionA.timestamp, serverField.versionB.timestamp);
    if (localField.timestamp > maxTs) return localField;
    return serverField;
  }

  if (!serverField.conflict && localField.conflict) {
    const maxTs = Math.max(localField.versionA.timestamp, localField.versionB.timestamp);
    if (serverField.timestamp > maxTs) return serverField;
    return localField;
  }

  if (serverField.conflict && localField.conflict) {
    return localField; // Local keeps its own conflict
  }

  const sameDevice = localField.updatedBy === serverField.updatedBy;
  const sameTime   = localField.timestamp  === serverField.timestamp;

  if (!sameDevice && !sameTime) {
    return {
      conflict: true,
      versionA: serverField,
      versionB: localField
    };
  }

  if (serverField.timestamp > localField.timestamp) return serverField;
  return localField;
}

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
        const mergedReport = {
          reportId: report.reportId,
          injuredCount: mergeFieldClient(existingLocal.injuredCount, report.injuredCount),
          notes: mergeFieldClient(existingLocal.notes, report.notes),
          location: mergeFieldClient(existingLocal.location, report.location),
          priority: mergeFieldClient(existingLocal.priority, report.priority),
          volunteersRequired: mergeFieldClient(existingLocal.volunteersRequired, report.volunteersRequired)
        };
        
        const hasConflict = ['injuredCount', 'notes', 'location', 'priority', 'volunteersRequired'].some(f => mergedReport[f]?.conflict === true);
        mergedReport.syncStatus = hasConflict ? 'conflict' : 'synced';
        
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
