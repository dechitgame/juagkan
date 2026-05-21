'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

interface Room {
  id: string
  name: string
  host_name: string
  player_count: number
  max_players: number
  bet_credits: number
  status: string
}

export default function LobbyPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [betCredits, setBetCredits] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  async function fetchRooms() {
    const sb = createBrowserClient()
    const { data } = await sb
      .from('game_rooms')
      .select('id, name, host_name:user_profiles!host_id(username), player_count, max_players, bet_credits, status')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20)
    setRooms((data as any[])?.map(r => ({
      ...r,
      host_name: r.host_name?.username ?? 'ไม่ทราบ',
    })) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRooms()
    const sb = createBrowserClient()
    const channel = sb.channel('rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, fetchRooms).subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  function getUserFromStorage() {
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        .replace('https://', '').split('.')[0]
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (!raw) return null
      const session = JSON.parse(raw)
      return session?.user ?? null
    } catch { return null }
  }

  async function createRoom() {
    if (!roomName.trim()) return
    setCreating(true)
    const sb = createBrowserClient()

    // set session ให้ Supabase client ก่อน ป้องกัน RLS ไม่รู้จัก user
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        .replace('https://', '').split('.')[0]
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (!raw) { router.push('/login'); return }
      const stored = JSON.parse(raw)
      if (!stored?.access_token) { router.push('/login'); return }
      await sb.auth.setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token ?? '',
      })
    } catch {
      router.push('/login'); return
    }

    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    // สร้าง user_profiles ถ้ายังไม่มี (กรณี Google/Facebook login ครั้งแรก)
    await sb.from('user_profiles').upsert({
      id: user.id,
      username: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'ผู้เล่น',
      credits: 0,
    }, { onConflict: 'id', ignoreDuplicates: true })

    const { data, error } = await sb.from('game_rooms').insert({
      name: roomName.trim(),
      host_id: user.id,
      max_players: maxPlayers,
      bet_credits: betCredits,
      status: 'waiting',
      player_count: 1,
    }).select('id').single()

    if (error) {
      alert(`สร้างห้องไม่ได้: ${error.message}`)
      setCreating(false)
      return
    }
    if (data) router.push(`/room/${data.id}`)
    setCreating(false)
  }

  return (
    <main className="min-h-screen px-4 py-5" style={{ background: '#0A0A0A' }}>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">🌐 ห้องเกม</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>เลือกห้องหรือสร้างใหม่</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchRooms} className="btn-outline text-xs px-3 py-2">รีเฟรช</button>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-gold text-xs px-3 py-2">+ สร้างห้อง</button>
          </div>
        </div>

        {showCreate && (
          <div className="card-glass p-4 space-y-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>สร้างห้องใหม่</h2>
            <input value={roomName} onChange={e => setRoomName(e.target.value)}
              placeholder="ชื่อห้อง" className="input-dark" />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>จำนวนผู้เล่น</label>
                <select value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)}
                  className="input-dark">
                  <option value={2}>2 คน</option>
                  <option value={3}>3 คน</option>
                  <option value={4}>4 คน</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>เดิมพัน (เครดิต)</label>
                <input type="number" min={0} value={betCredits} onChange={e => setBetCredits(+e.target.value)}
                  className="input-dark" />
              </div>
            </div>
            <button onClick={createRoom} disabled={creating || !roomName.trim()} className="btn-gold w-full">
              {creating ? 'กำลังสร้าง…' : 'สร้างห้อง'}
            </button>
          </div>
        )}

        {/* จับคู่ผู้เล่น */}
        <div
          className="card-glass p-4 flex items-center justify-between cursor-pointer"
          style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}
          onClick={() => router.push('/play')}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-3xl">🌐</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 border border-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">เล่นกับคนอื่นในประเทศ</p>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>ออนไลน์</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                จับคู่กับผู้เล่นทั่วประเทศ · รอไม่นาน
              </p>
            </div>
          </div>
          <button className="btn-gold text-xs px-4 py-2">จับคู่เลย</button>
        </div>

        {/* หัวหน้าห้องออนไลน์ */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.25)' }}>ห้องผู้เล่นจริง</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>กำลังโหลด…</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10 card-glass">
            <div className="text-3xl mb-2">🎴</div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>ยังไม่มีห้อง กดสร้างใหม่เลย!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map(room => (
              <div key={room.id} className="card-glass p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{room.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    โดย {room.host_name} · {room.player_count}/{room.max_players} คน
                    {room.bet_credits > 0 && ` · 💎 ${room.bet_credits} เครดิต`}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="btn-gold text-xs px-4 py-2"
                  disabled={room.player_count >= room.max_players}
                >
                  เข้าร่วม
                </button>
              </div>
            ))}
          </div>
        )}

        <Link href="/dashboard" className="text-sm block text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ← กลับ Dashboard
        </Link>
      </div>
    </main>
  )
}
