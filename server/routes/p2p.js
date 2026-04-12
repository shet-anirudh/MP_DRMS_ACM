const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { mergeField } = require('./sync');

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
        
        const hasConflict = ['injuredCount', 'notes', 'location'].some(f => mergedReport[f]?.conflict === true);
        mergedReport.syncStatus = hasConflict ? 'conflict' : 'synced';
        
        store.upsertReport(mergedReport);
      }
    });

    res.json({ reports: store.getReports() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
