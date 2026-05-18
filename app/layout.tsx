import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'จั่วกัน — เกมดัมมี่ออนไลน์',
  description: 'เกมดัมมี่ไทยออนไลน์ เล่นกับ AI หรือเพื่อน',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
