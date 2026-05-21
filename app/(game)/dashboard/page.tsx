'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

interface Profile {
  username: string
  credits: number
  total_wins: number
  total_losses: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // อ่าน session จาก localStorage ตรงๆ เหมือน layout
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
          .replace('https://', '').split('.')[0]
        const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
        if (!raw) { router.replace('/login'); return }

        const session = JSON.parse(raw)
        const now = Math.floor(Date.now() / 1000)
        if (!session?.access_token || !session?.user?.id) { router.replace('/login'); return }
        if (session.expires_at && session.expires_at < now) { router.replace('/login'); return }

        const userId = session.user.id
        const email = session.user.email ?? ''
        setUser({ id: userId, email })

        const sb = createBrowserClient()
        const { data } = await sb
          .from('user_profiles')
          .select('username, credits, total_wins, total_losses')
          .eq('id', userId)
          .single()

        setProfile(data)
        setLoading(false)
      } catch {
        router.replace('/login')
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-4xl animate-pulse">🃏</div>
      </main>
    )
  }

  const username = profile?.username ?? user?.email?.split('@')[0] ?? 'ผู้เล่น'
  const credits = profile?.credits ?? 0
  const wins = profile?.total_wins ?? 0
  const losses = profile?.total_losses ?? 0

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(201,168,76,0.1), transparent), #0A0A0A' }}>
      <div className="max-w-md mx-auto space-y-5">
        <div className="card-glass p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.3)' }}>
              🃏
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{username}</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="card-glass p-3">
              <div className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{credits}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>เครดิต</div>
            </div>
            <div className="card-glass p-3">
              <div className="text-xl font-bold text-green-400">{wins}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>ชนะ</div>
            </div>
            <div className="card-glass p-3">
              <div className="text-xl font-bold text-red-400">{losses}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>แพ้</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/play" className="card-glass p-4 flex flex-col items-center gap-2 hover:border-yellow-400/30 transition-colors">
            <span className="text-2xl">🤖</span>
            <span className="text-sm font-medium">เล่นกับ AI</span>
          </Link>
          <Link href="/lobby" className="card-glass p-4 flex flex-col items-center gap-2 hover:border-yellow-400/30 transition-colors">
            <span className="text-2xl">🌐</span>
            <span className="text-sm font-medium">Multiplayer</span>
          </Link>
          <Link href="/leaderboard" className="card-glass p-4 flex flex-col items-center gap-2 hover:border-yellow-400/30 transition-colors">
            <span className="text-2xl">🏆</span>
            <span className="text-sm font-medium">อันดับ</span>
          </Link>
          <Link href="/credits" className="card-glass p-4 flex flex-col items-center gap-2 hover:border-yellow-400/30 transition-colors">
            <span className="text-2xl">💎</span>
            <span className="text-sm font-medium">เติมเครดิต</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
