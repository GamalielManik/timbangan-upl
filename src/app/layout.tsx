import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'BARANG MASUK UPL',
  description: 'Aplikasi Pencatatan Penimbangan Limbah Plastik',
  manifest: '/timbangan-upl/manifest.json',
  icons: {
    icon: '/timbangan-upl/favicon.ico',
    apple: '/timbangan-upl/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}