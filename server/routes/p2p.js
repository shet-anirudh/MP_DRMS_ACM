const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { mergeField } = require('./sync');

router.post('/', async (req, res) => {
  try {
    const reports = req.body.reports;

    if (!Array.isArray(reports)) {
      return res.status(400).json({ error: 'reports must be an array' });
    }

    for (const incomingReport of reports) {
      const serverReport = await store.findReport(incomingReport.reportId);

      if (!serverReport) {
        incomingReport.syncStatus = 'synced';
        await store.upsertReport(incomingReport);
      } else {
        const mergedReport = {
          reportId: incomingReport.reportId,
          injuredCount: mergeField(serverReport.injuredCount, incomingReport.injuredCount),
          notes: mergeField(serverReport.notes, incomingReport.notes),
          location: mergeField(serverReport.location, incomingReport.location),
          priority: mergeField(serverReport.priority, incomingReport.priority),
          volunteersRequired: mergeField(serverReport.volunteersRequired, incomingReport.volunteersRequired)
        };

        const hasConflict = ['injuredCount', 'notes', 'location', 'priority', 'volunteersRequired'].some(f => mergedReport[f]?.conflict === true);
        mergedReport.syncStatus = hasConflict ? 'conflict' : 'synced';

        await store.upsertReport(mergedReport);
      }
    }

    res.json({ reports: await store.getReports() });
  } catch (err) {
    console.error('P2P sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
