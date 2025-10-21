const { Client } = require('pg')
const scrypt = require('scrypt-kdf')
const { v4: uuid } = require('uuid')

const { DATABASE_URL, MEDUSA_ADMIN_EMAIL, MEDUSA_ADMIN_PASSWORD } = process.env
if (!DATABASE_URL || !MEDUSA_ADMIN_EMAIL || !MEDUSA_ADMIN_PASSWORD) process.exit(0)

const hashAdminPassword = async (password) => {
  const buffer = await scrypt.kdf(password, { logN: 1, r: 1, p: 1 })
  return buffer.toString('base64')
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const connectWithRetry = async () => {
  const attempts = Number(process.env.MEDUSA_ADMIN_RETRIES || 10)
  const delayMs = Number(process.env.MEDUSA_ADMIN_RETRY_DELAY_MS || 2000)

  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      if (attempt > 1) {
        console.log(`[ensure-admin] connected to database after ${attempt} attempts`)
      }
      return client
    } catch (error) {
      lastError = error
      console.warn(`[ensure-admin] attempt ${attempt} failed: ${error?.message || error}`)
      try {
        await client.end()
      } catch (disconnectError) {
        console.warn('[ensure-admin] failed to close client after error:', disconnectError?.message || disconnectError)
      }
      if (attempt < attempts) {
        await wait(delayMs)
      }
    }
  }
  throw lastError || new Error('Failed to connect to database')
}

const run = async () => {
  const c = await connectWithRetry()
  const email = MEDUSA_ADMIN_EMAIL.trim().toLowerCase()
  const pwd = String(MEDUSA_ADMIN_PASSWORD || '').trim()
  const now = new Date().toISOString()
  const hash = await hashAdminPassword(pwd)
  console.log('hash generated', hash)

  try {
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
  } catch (error) {
    await c.query('ROLLBACK')
    throw error
  } finally {
    await c.end()
  }
}

run().catch((e) => {
  console.error('ensure-admin error:', e?.message || e)
  process.exit(0)
})
