#!/usr/bin/env node
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const pg = require('pg')
const bcrypt = require('bcryptjs')
const scrypt = require('scrypt-kdf')

const backendRoot = path.join(__dirname, '..')
const isBcryptHash = (hash) => typeof hash === 'string' && hash.startsWith('$2')
const verifyAdminPassword = async (password, hash) => {
  if (!hash || !password) return false
  if (isBcryptHash(hash)) {
    try {
      return await bcrypt.compare(password, hash)
    } catch (err) {
      return false
    }
  }
  try {
    const buffer = Buffer.from(hash, 'base64')
    if (!buffer.length) return false
    return await scrypt.verify(buffer, password)
  } catch (err) {
    return false
  }
}

const logDbFingerprint = async () => {
  try {
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const db = await c.query('SELECT current_database() db, current_user usr')
    const email = (process.env.MEDUSA_ADMIN_EMAIL || '').toLowerCase()
    const u = await c.query('SELECT email, role, deleted_at IS NOT NULL AS soft_deleted FROM "user" WHERE email=$1', [email])
    console.log('[admin-lite] DB:', db.rows[0])
    console.log('[admin-lite] Admin row:', u.rows[0] || { email, missing: true })
    await c.end()
  } catch (e) {
    console.warn('[admin-lite] DB fingerprint failed:', e?.message || e)
  }
}

const logPasswordMatch = async () => {
  try {
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const email = (process.env.MEDUSA_ADMIN_EMAIL || '').toLowerCase()
    const r = await c.query('SELECT password_hash FROM "user" WHERE email=$1', [email])
    const ok = r.rows.length
      ? await verifyAdminPassword(process.env.MEDUSA_ADMIN_PASSWORD || '', r.rows[0].password_hash)
      : false
    console.log('[admin-lite] Admin password match:', ok)
    await c.end()
  } catch (e) {
    console.warn('[admin-lite] Password match check failed:', e.message)
  }
}

const resolveBin = (name) => {
  const suffix = process.platform === 'win32' ? '.cmd' : ''
  return path.join(backendRoot, 'node_modules', '.bin', name + suffix)
}

const syncSourceToDist = () => {
  const srcDir = path.join(backendRoot, 'src')
  const distDir = path.join(backendRoot, 'dist')

  try {
    if (!fs.existsSync(srcDir)) {
      return
    }

    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true })
    }

    fs.cpSync(srcDir, distDir, { recursive: true })
    console.log('[admin-lite] Synced src -> dist before start')
  } catch (error) {
    console.warn('[admin-lite] Failed to sync src to dist:', error?.message || error)
  }
}

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      cwd: backendRoot,
      ...options,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(command + ' ' + args.join(' ') + ' exited with code ' + code))
      }
    })
  })

const start = async () => {
  const skipMigrations = String(process.env.MEDUSA_SKIP_MIGRATIONS || '').toLowerCase() === 'true'
  const medusaBin = resolveBin('medusa')

  try {
    syncSourceToDist()

    if (!skipMigrations) {
      console.log('[admin-lite] Running Medusa migrations...')
      await run(medusaBin, ['migrations', 'run'])
    } else {
      console.log('[admin-lite] Skipping migrations (MEDUSA_SKIP_MIGRATIONS=true)')
    }

    await logDbFingerprint()
    await logPasswordMatch()

    console.log('[admin-lite] Ensuring admin user exists...')
    try {
      await run('yarn', ['ensure:admin'])
    } catch (err) {
      console.warn('[admin-lite] ensure:admin failed (non-fatal):', err?.message || err)
    }

    const extraArgs = process.argv.slice(2)
    const host = process.env.MEDUSA_HOST || '0.0.0.0'
    const port = process.env.PORT || '9000'
    console.log('[admin-lite] Starting Medusa server on ' + host + ':' + port + '...')
    await run(medusaBin, ['start', '-p', port, '-H', host, ...extraArgs])
  } catch (error) {
    console.error('[admin-lite] migrate-and-start failed', error)
    process.exit(1)
  }
}

start()

