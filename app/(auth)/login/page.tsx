'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const nextPath = params.get('next') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🃏</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--gold2)' }}>จั่วกัน</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>เข้าสู่ระบบเพื่อเล่นแบบ Multiplayer</p>
      </div>

      <div className="card-glass p-6 space-y-4">
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
          ← เล่นกับ AI โดยไม่ต้อง login
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
