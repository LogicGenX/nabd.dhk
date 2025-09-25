const bcrypt = require('bcryptjs')
const scrypt = require('scrypt-kdf')

const isBcryptHash = (hash) => typeof hash === 'string' && hash.startsWith('$2')

const verifyAdminPassword = async (password, hash) => {
  if (!hash || typeof hash !== 'string') return false
  if (!password || typeof password !== 'string') return false

  if (isBcryptHash(hash)) {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      return false
    }
  }

  try {
    const buffer = Buffer.from(hash, 'base64')
    if (!buffer.length) return false
    return await scrypt.verify(buffer, password)
  } catch (error) {
    return false
  }
}

module.exports = {
  isBcryptHash,
  verifyAdminPassword,
}
