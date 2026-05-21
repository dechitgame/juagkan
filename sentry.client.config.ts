import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // จับ error ทุกอย่างใน browser
  tracesSampleRate: 0.1,       // 10% of requests for performance
  replaysOnErrorSampleRate: 1, // replay ทุก session ที่เกิด error
  replaysSessionSampleRate: 0, // ไม่ record ปกติ (ประหยัด quota)

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
