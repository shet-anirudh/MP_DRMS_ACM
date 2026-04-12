const express = require('express');
const router = express.Router();
const store = require('../data/store');

function mergeField(serverField, incomingField) {
  if (!serverField) return incomingField;
  if (!incomingField) return serverField;

  if (serverField.conflict && !incomingField.conflict) {
    const maxTs = Math.max(serverField.versionA.timestamp, serverField.versionB.timestamp);
    if (incomingField.timestamp > maxTs) return incomingField;
    return serverField;
  }

  if (!serverField.conflict && incomingField.conflict) {
    const maxTs = Math.max(incomingField.versionA.timestamp, incomingField.versionB.timestamp);
    if (serverField.timestamp > maxTs) return serverField;
    return incomingField;
  }

  if (serverField.conflict && incomingField.conflict) {
    return serverField;
  }

  const sameDevice = serverField.updatedBy === incomingField.updatedBy;
  const sameTime   = serverField.timestamp  === incomingField.timestamp;

  if (!sameDevice && !sameTime) {
    return {
      conflict: true,
      versionA: serverField,   // server version
      versionB: incomingField  // client version
    };
  }

  if (incomingField.timestamp > serverField.timestamp) return incomingField;
  return serverField;
}

router.get('/', (req, res) => {
  res.json({ reports: store.getReports() });
});

router.post('/', (req, res) => {
  try {
    const reports = req.body.reports;
    
    if (!Array.isArray(reports)) {
      return res.status(400).json({ error: 'reports must be an array' });
    }
    
    reports.forEach(incomingReport => {
      const serverReport = store.findReport(incomingReport.reportId);
      
      if (!serverReport) {
        incomingReport.syncStatus = 'synced';
        store.upsertReport(incomingReport);
      } else {
        const mergedReport = {
          reportId: incomingReport.reportId,
          injuredCount: mergeField(serverReport.injuredCount, incomingReport.injuredCount),
          notes: mergeField(serverReport.notes, incomingReport.notes),
          location: mergeField(serverReport.location, incomingReport.location)
        };
        
        const hasConflict = ['injuredCount', 'notes', 'location'].some(f => mergedReport[f]?.conflict === true)
        mergedReport.syncStatus = hasConflict ? 'conflict' : 'synced';
        
        store.upsertReport(mergedReport);
      }
    });

    res.json({ reports: store.getReports() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, mergeField };
