import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/ai/', '/login', '/register', '/share/'],
      },
    ],
    sitemap: `${SITE_URL.href}sitemap.xml`,
  }
}
