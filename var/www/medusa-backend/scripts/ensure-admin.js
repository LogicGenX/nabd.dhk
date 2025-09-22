/*
 * Ensures an admin user exists using bcrypt hashes stored in varchar columns.
 * This script is idempotent and skips execution when required environment
 * variables are missing so boot remains resilient.
 */
const { Client } = require('pg')
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')

if (!process.env.DATABASE_URL || !process.env.MEDUSA_ADMIN_EMAIL || !process.env.MEDUSA_ADMIN_PASSWORD) {
  try {
    require('dotenv').config()
  } catch (err) {
    // ignore missing dotenv in production environments
  }
}

const { DATABASE_URL, MEDUSA_ADMIN_EMAIL, MEDUSA_ADMIN_PASSWORD } = process.env

if (!DATABASE_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) {
  console.error('Missing env: DATABASE_URL, MEDUSA_ADMIN_EMAIL, MEDUSA_ADMIN_PASSWORD')
  process.exit(0)
}

const run = async () => {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const email = MEDUSA_ADMIN_EMAIL.trim().toLowerCase()
  const now = new Date().toISOString()
  const hash = await bcrypt.hash(MEDUSA_ADMIN_PASSWORD, 10)

  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT id FROM "user" WHERE email = $1', [email])

    if (rows.length === 0) {
      const rawId =
        typeof randomUUID === 'function'
          ? randomUUID()
          : Math.random().toString(36).slice(2, 34)
      const id = `usr_${rawId.replace(/-/g, '')}`

      await client.query(
        'INSERT INTO "user"(id,email,role,password_hash,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)',
        [id, email, 'admin', hash, now]
      )
      console.log(`Created admin ${email}`)
    } else {
      const id = rows[0].id
      await client.query(
        'UPDATE "user" SET role=$2, password_hash=$3, updated_at=$4 WHERE id=$1',
        [id, 'admin', hash, now]
      )
      console.log(`Updated admin ${email}`)
    }

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.warn('ensure-admin rollback failed:', rollbackError?.message || rollbackError)
    }
    throw error
  } finally {
    await client.end()
  }
}

run().catch((e) => {
  console.error('ensure-admin error:', e?.message || e)
  process.exit(0)
})
