const { scheduleBootstrap } = require('../utils/store-region-bootstrap')

module.exports = async (container) => {
  if (!container || typeof container.resolve !== 'function') {
    return
  }
  await scheduleBootstrap(container, { awaitCompletion: true }).catch(() => {
    // errors are already logged inside scheduleBootstrap
  })
}

module.exports.default = module.exports
