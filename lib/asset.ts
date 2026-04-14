const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Prepend the configured basePath to an absolute public-asset path.
 *
 * next/image and <img> do NOT auto-apply basePath (only next/link does),
 * so anything that ends up as a raw src/href to a file in /public must
 * go through this helper.
 */
export function asset(path: string): string {
  if (!path) return path
  if (!path.startsWith('/')) return path
  if (basePath && path.startsWith(`${basePath}/`)) return path
  return `${basePath}${path}`
}
