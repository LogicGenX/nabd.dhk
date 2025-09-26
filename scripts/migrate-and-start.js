#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const backendScript = path.join(__dirname, '..', 'var', 'www', 'medusa-backend', 'scripts', 'migrate-and-start.js')

if (!fs.existsSync(backendScript)) {
  console.error('[admin-lite] Unable to locate backend migrate-and-start script at ' + backendScript)
  process.exit(1)
}

const child = spawn(process.execPath, [backendScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

child.on('close', (code) => {
  process.exit(code)
})

child.on('error', (error) => {
  console.error('[admin-lite] Failed to launch backend migrate-and-start script:', error?.message || error)
  process.exit(1)
})
