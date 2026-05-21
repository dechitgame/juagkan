import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSentryConfig(nextConfig, {
  org: 'dechit',
  project: 'javascript-nextjs',

  // ไม่ส่ง source maps ขึ้น Sentry (ประหยัด build time)
  sourcemaps: { disable: true },

  // ไม่แสดง Sentry build logs
  silent: true,

  // Auto-instrument Next.js API routes
  autoInstrumentServerFunctions: true,
})
