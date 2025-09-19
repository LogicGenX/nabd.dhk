const assert = require('assert')

const runAdminLiteTests = require('./admin-lite.test')

;(async () => {
  assert.strictEqual(1 + 1, 2)
  await runAdminLiteTests()
  console.log('tests passed')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
