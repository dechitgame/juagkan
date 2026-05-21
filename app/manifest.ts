import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'จั่วกัน — ดัมมี่ Royal',
    short_name: 'จั่วกัน',
    description: 'เกมดัมมี่ไทย Royal Edition',
    start_url: '/play',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#0a0907',
    theme_color: '#0a0907',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
