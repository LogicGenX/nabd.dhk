import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import schemas from './schemas';

export default defineConfig({
  name: 'nabd-studio',
  title: 'NABD Studio',
  projectId: 'yourProjectId',
  dataset: 'production',
  plugins: [structureTool()],
  schema: { types: schemas },
});
