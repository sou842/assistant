import type { Metadata } from 'next'

import HomePageClient from './_components/home-page-client'
import { homeFaqItems } from './home-data'
import {
  DEFAULT_DESCRIPTION,
  OG_IMAGE_URL,
  SITE_NAME,
  SITE_URL,
  toAbsoluteUrl,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: 'AI Scheduling, Tasks, and Memory',
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  keywords: [
    'Jarvis',
    'AI assistant',
    'AI scheduling',
    'task automation',
    'integrations',
    'persistent memory',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'AI Scheduling, Tasks, and Memory',
    description: DEFAULT_DESCRIPTION,
    url: '/',
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
    title: 'AI Scheduling, Tasks, and Memory',
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL.toString(),
    description: DEFAULT_DESCRIPTION,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL.toString(),
    logo: toAbsoluteUrl('/icon.svg'),
    image: OG_IMAGE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homeFaqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  },
]

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePageClient />
    </>
  )
}
