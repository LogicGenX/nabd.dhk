const fs = require('fs/promises')

exports.upload = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : []
  if (!files.length) {
    return res.status(400).json({ message: 'No files uploaded' })
  }

  const fileService = req.scope.resolve('fileService')
  const uploads = []

  for (const file of files) {
    const uploaded = await fileService.upload(file)
    uploads.push({ url: uploaded.url || uploaded.Location || uploaded.path || null })
    if (file.path) {
      await fs.unlink(file.path).catch(() => {})
    }
  }

  res.status(201).json({ uploads })
}
