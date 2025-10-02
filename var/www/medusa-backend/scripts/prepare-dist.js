#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const backendRoot = path.join(__dirname, '..')
const srcDir = path.join(backendRoot, 'src')
const distDir = path.join(backendRoot, 'dist')

const prepareDist = () => {
  if (!fs.existsSync(srcDir)) {
    console.log('[admin-lite] prepare-dist: src directory missing, skipping')
    return false
  }

  try {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true })
    }

    fs.cpSync(srcDir, distDir, { recursive: true })
    console.log('[admin-lite] prepare-dist: synced src -> dist')
    return true
  } catch (error) {
    console.error('[admin-lite] prepare-dist: failed to copy src to dist', error)
    return false
  }
}

if (require.main === module) {
  if (!prepareDist()) {
    process.exit(1)
  }
}

module.exports = { prepareDist }
