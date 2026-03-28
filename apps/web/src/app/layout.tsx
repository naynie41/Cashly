import type { Metadata } from 'next'
import { Barlow, DM_Sans } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-barlow',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cashly',
  description: 'Invoice and cash flow management for small businesses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${dmSans.variable}`}>
      <body className="bg-cashly-cream text-cashly-black font-sans antialiased">{children}</body>
    </html>
  )
}
