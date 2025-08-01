import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import schemas from './schemas';

export default defineConfig({
  projectId: 'yourProjectId',
  dataset: 'production',
  plugins: [structureTool()],
  schema: { types: schemas },
});
