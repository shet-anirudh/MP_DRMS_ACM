const { pool } = require('../db/postgres')

async function getReports() {
  const result = await pool.query('SELECT data FROM reports ORDER BY updated_at DESC')
  return result.rows.map(row => row.data)
}

async function findReport(reportId) {
  const result = await pool.query(
    'SELECT data FROM reports WHERE report_id = $1',
    [reportId]
  )
  return result.rows[0]?.data || null
}

async function upsertReport(report) {
  await pool.query(
    `INSERT INTO reports (report_id, data, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (report_id)
     DO UPDATE SET data = $2, updated_at = NOW()`,
    [report.reportId, JSON.stringify(report)]
  )
  return report
}

async function setReports(reportsArray) {
  for (const report of reportsArray) {
    await upsertReport(report)
  }
}

module.exports = { getReports, findReport, upsertReport, setReports }
