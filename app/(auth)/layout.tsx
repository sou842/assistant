import type { Metadata } from 'next'

import { SITE_NAME } from '@/lib/seo'

export const metadata: Metadata = {
  title: {
    default: 'Account',
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Sign in to Jarvis.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
