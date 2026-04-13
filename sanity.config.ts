import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { apiVersion, dataset, projectId } from './sanity/env'
import { schema } from './sanity/schemas'

export default defineConfig({
  name: 'default',
  title: '2×2 — контент',
  projectId,
  dataset,
  apiVersion,
  basePath: '/studio',
  plugins: [structureTool()],
  schema,
})
