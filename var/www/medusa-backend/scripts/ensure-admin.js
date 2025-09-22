const { Client } = require('pg')
const bcrypt = require('bcryptjs')
const { v4: uuid } = require('uuid')

const { DATABASE_URL, MEDUSA_ADMIN_EMAIL, MEDUSA_ADMIN_PASSWORD } = process.env
if (!DATABASE_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) process.exit(0)

const run = async () => {
  const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const email = MEDUSA_ADMIN_EMAIL.trim().toLowerCase()
  const now = new Date().toISOString()
  const hash = await bcrypt.hash(MEDUSA_ADMIN_PASSWORD, 10)

  await c.query('BEGIN')
  const { rows } = await c.query('SELECT id FROM "user" WHERE email=$1', [email])
  if (!rows.length) {
    const id = `usr_${uuid().replace(/-/g, '')}`
    await c.query(
      'INSERT INTO "user"(id,email,role,password_hash,created_at,updated_at,deleted_at) VALUES ($1,$2,$3,$4,$5,$5,NULL)',
      [id, email, 'admin', hash, now]
    )
    console.log(`Created admin ${email}`)
  } else {
    await c.query(
      'UPDATE "user" SET role=$2, password_hash=$3, deleted_at=NULL, updated_at=$4 WHERE id=$1',
      [rows[0].id, 'admin', hash, now]
    )
    console.log(`Updated admin ${email}`)
  }
  await c.query('COMMIT')
  await c.end()
}

run().catch((e) => {
  console.error('ensure-admin error:', e?.message || e)
  process.exit(0)
})
