'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัว'); return }
    setLoading(true)
    setError('')

    const sb = createBrowserClient()
    const { error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(201,168,76,0.1), transparent), #0A0A0A' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🃏</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold2)' }}>สมัครใหม่</h1>
        </div>

        <div className="card-glass p-6 space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>ชื่อในเกม</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="NickName" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>อีเมล</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@email.com" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>รหัสผ่าน</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="อย่างน้อย 6 ตัว" className="input-dark" />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-gold w-full">
              {loading ? '⏳ กำลังสมัคร…' : '🎮 สมัครและเริ่มเล่น'}
            </button>
          </form>
          <div className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            มีบัญชีแล้ว?{' '}
            <Link href="/login" style={{ color: 'var(--gold)' }}>เข้าสู่ระบบ</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
