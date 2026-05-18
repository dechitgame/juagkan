import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function LeaderboardPage() {
  const sb = createServiceClient()
  const { data } = await sb
    .from('user_profiles')
    .select('username, total_wins, total_losses, credits')
    .order('total_wins', { ascending: false })
    .limit(50)

  const players = data ?? []

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">🏆 อันดับผู้เล่น</h1>
          <Link href="/dashboard" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>← กลับ</Link>
        </div>

        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={i} className="card-glass p-4 flex items-center gap-3">
              <div className="w-8 text-center font-bold" style={{ color: i < 3 ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{p.username}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ชนะ {p.total_wins} · แพ้ {p.total_losses}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{p.total_wins}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>wins</p>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <div className="text-center py-10 card-glass">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>ยังไม่มีข้อมูล</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
