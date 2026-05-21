'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const nextPath = params.get('next') || '/lobby'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fbLoading, setFbLoading] = useState(false)
  const [error, setError] = useState(params.get('error') === 'oauth' ? '⚠️ OAuth ล้มเหลว — กรุณาลองใหม่' : '')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = createBrowserClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    if (err) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }
    router.push(nextPath)
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')
    const sb = createBrowserClient()
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    })
    if (err) {
      setError('เข้าสู่ระบบด้วย Google ไม่ได้')
      setGoogleLoading(false)
    }
  }

  async function handleFacebookLogin() {
    setFbLoading(true)
    setError('')
    const sb = createBrowserClient()
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    })
    if (err) {
      setError('เข้าสู่ระบบด้วย Facebook ไม่ได้')
      setFbLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🃏</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--gold2)' }}>จั่วกัน</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>เข้าสู่ระบบเพื่อเล่นแบบ Multiplayer</p>
      </div>

      <div className="card-glass p-6 space-y-4">
        {/* Social Login */}
        <div className="space-y-3">
          <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: googleLoading ? 'rgba(255,255,255,0.05)' : '#fff',
              color: googleLoading ? 'rgba(255,255,255,0.4)' : '#1a1a1a',
              fontWeight: 700, fontSize: '0.95rem', border: 'none',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
            {googleLoading ? '⏳ กำลังเชื่อมต่อ…' : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </>
            )}
          </button>

          <button type="button" onClick={handleFacebookLogin} disabled={fbLoading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: fbLoading ? 'rgba(255,255,255,0.05)' : '#1877F2',
              color: fbLoading ? 'rgba(255,255,255,0.4)' : '#fff',
              fontWeight: 700, fontSize: '0.95rem', border: 'none',
              cursor: fbLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
            {fbLoading ? '⏳ กำลังเชื่อมต่อ…' : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                เข้าสู่ระบบด้วย Facebook
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>หรือเข้าด้วยอีเมล</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@email.com" className="input-dark" />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••" className="input-dark" />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? '⏳ กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" style={{ color: 'var(--gold)' }}>สมัครใหม่</Link>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/play" className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ← เล่นได้เลย ไม่ต้อง login
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(201,168,76,0.1), transparent), #0A0A0A' }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
