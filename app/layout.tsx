import React from "react"
import type { Metadata } from 'next'
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"],
  variable: '--font-instrument'
});

const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-instrument-serif'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  title: 'Sourav Samanta | Full Stack Developer Portfolio',
  description: 'Full Stack Developer specializing in Node.js, React, and scalable web architectures. Explore my projects and professional experience.',
  generator: 'Next.js',
  keywords: ['Sourav Samanta', 'Full Stack Developer', 'React Developer', 'Node.js Developer', 'TypeScript', 'Bengaluru Developer'],
  authors: [{ name: 'Sourav Samanta' }],
  creator: 'Sourav Samanta',
  metadataBase: new URL('https://sou842.github.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Sourav Samanta | Full Stack Developer',
    description: 'I design and build fast, accessible web experiences with modern stacks.',
    url: 'https://sou842.github.io',
    siteName: 'Sourav Samanta Portfolio',
    images: [
      {
        url: '/placeholder-logo.png', // Fallback to placeholder if no specific OG image
        width: 1200,
        height: 630,
        alt: 'Sourav Samanta Portfolio',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sourav Samanta | Full Stack Developer',
    description: 'I design and build fast, accessible web experiences with modern stacks.',
    images: ['/placeholder-logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Sourav Samanta",
              "url": "https://sou842.github.io",
              "jobTitle": "Full Stack Developer",
              "sameAs": [
                "https://github.com/sou842",
                "https://www.linkedin.com/in/codebysourav/"
              ],
              "description": "Full Stack Developer specializing in Node.js, React, and scalable web architectures."
            })
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
