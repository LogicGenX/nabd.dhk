import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import schemas from './schemas'

export default defineConfig({
  projectId: 'yourProjectId',
  dataset: 'production',
  plugins: [deskTool()],
  schema: { types: schemas }
})
