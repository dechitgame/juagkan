'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const next = params.get('next') ?? '/lobby'

    try {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const p = new URLSearchParams(hash.substring(1))
        const access_token = p.get('access_token') ?? ''
        const refresh_token = p.get('refresh_token') ?? ''
        const expires_in = parseInt(p.get('expires_in') ?? '3600')
        const token_type = p.get('token_type') ?? 'bearer'

        if (access_token) {
          // Decode JWT payload ใน browser — ไม่ต้อง network call
          const parts = access_token.split('.')
          if (parts.length === 3) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(atob(b64))

            const session = {
              access_token,
              token_type,
              expires_in,
              expires_at: Math.floor(Date.now() / 1000) + expires_in,
              refresh_token,
              user: {
                id: payload.sub ?? '',
                aud: payload.aud ?? 'authenticated',
                role: payload.role ?? 'authenticated',
                email: payload.email ?? '',
                phone: '',
                app_metadata: payload.app_metadata ?? {},
                user_metadata: payload.user_metadata ?? {},
                identities: [],
                created_at: new Date((payload.iat ?? 0) * 1000).toISOString(),
                updated_at: new Date((payload.iat ?? 0) * 1000).toISOString(),
                is_anonymous: false,
              },
            }

            // เขียนลง localStorage ตรงๆ ด้วย Supabase key format
            const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
              .replace('https://', '').split('.')[0]

            if (projectRef) {
              localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
              router.replace(next)
              return
            }
          }
        }
      }
    } catch (e) {
      console.error('Callback error:', e)
    }

    router.replace('/login?error=oauth')
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse">🃏</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>กำลังเข้าสู่ระบบ…</p>
      </div>
    </main>
  )
}

export default function CallbackPage() {
  return <Suspense><CallbackHandler /></Suspense>
}
