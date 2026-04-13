import { createClient, type SanityClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from './env'

const isConfigured = Boolean(projectId) && projectId !== 'xxxxxxx'

export const client: SanityClient | null = isConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
    })
  : null

export async function sanityFetch<T>(query: string, params?: Record<string, unknown>): Promise<T> {
  if (!client) {
    throw new Error('Sanity is not configured')
  }
  return client.fetch<T>(query, params ?? {})
}
