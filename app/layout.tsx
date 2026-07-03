import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import { LangProvider } from '@/lib/i18n'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Zbalené? — inteligentný zoznam na cesty',
  description:
    'Zadaj destináciu a dátumy, my zistíme počasie a pripravíme ti packlist na mieru.',
}

export const viewport: Viewport = {
  themeColor: '#0e7c86',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sk" className={`bg-background ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  )
}
