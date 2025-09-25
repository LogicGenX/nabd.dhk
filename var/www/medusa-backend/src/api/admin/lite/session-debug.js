const pg = require('pg')
const { verifyAdminPassword } = require('./utils/password')

module.exports = async function sessionDebug(req, res) {
  res.setHeader('x-admin-lite-debug', 'hit')
  try {
    const { email, password } = req.body || {}
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const r = await c.query('SELECT email, role, deleted_at, password_hash FROM "user" WHERE email=$1', [
      String(email || '').toLowerCase(),
    ])
    await c.end()
    if (!r.rows.length) return res.status(404).json({ ok: false, reason: 'no-user' })
    if (r.rows[0].deleted_at) return res.status(403).json({ ok: false, reason: 'soft-deleted' })
    const ok = await verifyAdminPassword(password || '', r.rows[0].password_hash)
    return res.status(ok ? 200 : 401).json({ ok, role: r.rows[0].role })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
