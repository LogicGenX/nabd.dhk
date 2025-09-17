/*
 * Ensures an admin user exists in the Medusa database.
 * Uses direct SQL with bcryptjs for hashing to avoid CLI flakiness.
 */
const { Client } = require('pg')
const Scrypt = require('scrypt-kdf')
const { randomUUID } = require('crypto')

if (!process.env.DATABASE_URL) {
  require('dotenv').config()
}

async function ensureAdmin() {
  const email = process.env.MEDUSA_ADMIN_EMAIL || 'admin@nabd.dhk'
  const password = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret12345678'
  const first = process.env.MEDUSA_ADMIN_FIRST || 'Admin'
  const last = process.env.MEDUSA_ADMIN_LAST || 'User'
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    const active = await client.query('SELECT id FROM "user" WHERE email=$1 AND deleted_at IS NULL LIMIT 1', [email])
    // Medusa v1.x uses scrypt-kdf with low params in userService.hashPassword_
    const password_hash = (
      await Scrypt.kdf(password, { logN: 1, r: 1, p: 1 })
    ).toString('base64')

    if (active.rows.length) {
      await client.query(
        'UPDATE "user" SET first_name=$1, last_name=$2, password_hash=$3, role=$4, deleted_at=NULL, updated_at=NOW() WHERE email=$5',
        [first, last, password_hash, 'admin', email]
      )
      console.log(`Updated admin user ${email}`)
      const v = await client.query('SELECT password_hash FROM "user" WHERE email=$1', [email])
      const ok = await Scrypt.verify(Buffer.from(v.rows[0].password_hash, 'base64'), password)
      console.log('Password verify against DB hash:', ok)
      return
    }

    const deleted = await client.query('SELECT id FROM "user" WHERE email=$1 AND deleted_at IS NOT NULL LIMIT 1', [email])
    if (deleted.rows.length) {
      await client.query(
        'UPDATE "user" SET first_name=$1, last_name=$2, password_hash=$3, role=$4, deleted_at=NULL, updated_at=NOW() WHERE email=$5',
        [first, last, password_hash, 'admin', email]
      )
      console.log(`Restored and updated admin user ${email}`)
      const v = await client.query('SELECT password_hash FROM "user" WHERE email=$1', [email])
      const ok = await Scrypt.verify(Buffer.from(v.rows[0].password_hash, 'base64'), password)
      console.log('Password verify against DB hash:', ok)
      return
    }

    const id = 'usr_' + (randomUUID ? randomUUID() : Math.random().toString(36).slice(2))
      .replace(/-/g, '')
      .slice(0, 24)

    // Insert minimal required fields; other columns use defaults
    await client.query(
      'INSERT INTO "user" (id, email, first_name, last_name, password_hash, role) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, email, first, last, password_hash, 'admin']
    )
    console.log(`Created admin user ${email}`)

    const check = await client.query('SELECT email, role, password_hash FROM "user" WHERE email=$1', [email])
    const ok = await Scrypt.verify(Buffer.from(check.rows[0].password_hash, 'base64'), password)
    console.log('Password verify against DB hash:', ok)
  } finally {
    await client.end()
  }
}

ensureAdmin().catch((e) => {
  console.error('Failed to ensure admin:', e?.message || e)
  process.exit(1)
})
