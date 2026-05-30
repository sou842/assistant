import type { Metadata } from 'next'

import { OG_IMAGE_URL, SITE_NAME } from '@/lib/seo'
import ContactPageClient from './contact-page-client'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact the Jarvis team for product questions, partnerships, or support.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Contact Jarvis',
    description:
      'Contact the Jarvis team for product questions, partnerships, or support.',
    url: '/contact',
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} preview image`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Jarvis',
    description:
      'Contact the Jarvis team for product questions, partnerships, or support.',
    images: [OG_IMAGE_URL],
  },
}

export default function Contact() {
  return <ContactPageClient />
}
