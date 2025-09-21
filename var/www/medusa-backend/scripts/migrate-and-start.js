#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')

const resolveBin = (name) => {
  const suffix = process.platform === 'win32' ? '.cmd' : ''
  return path.join(__dirname, '..', 'node_modules', '.bin', name + suffix)
}

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
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
    if (!skipMigrations) {
      console.log('[admin-lite] Running Medusa migrations...')
      await run(medusaBin, ['migrations', 'run'])
    } else {
      console.log('[admin-lite] Skipping migrations (MEDUSA_SKIP_MIGRATIONS=true)')
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
