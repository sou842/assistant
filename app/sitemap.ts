import type { MetadataRoute } from 'next'

import { PUBLIC_ROUTES, toAbsoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_ROUTES.map((pathname) => ({
    url: toAbsoluteUrl(pathname),
    lastModified,
    changeFrequency: pathname === '/' ? 'weekly' : 'monthly',
    priority: pathname === '/' ? 1 : 0.7,
  }))
}
