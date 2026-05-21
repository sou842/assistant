import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans'
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <SessionProviderWrapper>
          {children}
          <Analytics />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
