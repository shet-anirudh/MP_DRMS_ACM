let reports = [];

function getReports() {
  return reports;
}

function setReports(newReports) {
  reports = newReports;
}

function findReport(id) {
  return reports.find(r => r.reportId === id);
}

function upsertReport(report) {
  const index = reports.findIndex(r => r.reportId === report.reportId);
  if (index !== -1) {
    reports[index] = report;
  } else {
    reports.push(report);
  }
}

module.exports = {
  getReports,
  setReports,
  findReport,
  upsertReport
};
