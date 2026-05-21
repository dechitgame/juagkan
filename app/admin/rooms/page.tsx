'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Room {
  id: string
  name: string
  status: string
  max_players: number
  player_count: number
  bet_credits: number
  created_at: string
  host: { username: string }
}

const STATUS_COLOR: Record<string, string> = {
  waiting: '#fbbf24',
  playing: '#4ade80',
  finished: 'rgba(255,255,255,0.3)',
}
const STATUS_LABEL: Record<string, string> = {
  waiting: '⏳ รอผู้เล่น',
  playing: '🎮 กำลังเล่น',
  finished: '✅ จบแล้ว',
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await authFetch('/api/admin/rooms')
    const data = await res.json()
    setRooms(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteRoom(id: string, name: string) {
    if (!confirm(`ปิดห้อง "${name}" ใช่ไหม?`)) return
    setDeleting(id)
    await authFetch('/api/admin/rooms', {
      method: 'DELETE',
      body: JSON.stringify({ roomId: id }),
    })
    setDeleting(null)
    load()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  const active = rooms.filter(r => r.status === 'playing').length
  const waiting = rooms.filter(r => r.status === 'waiting').length

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', margin: 0 }}>🏠 ห้องเกมทั้งหมด</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>ดูและจัดการห้องทั้งหมดในระบบ</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'กำลังเล่น', value: active, color: '#4ade80' },
          { label: 'รอผู้เล่น', value: waiting, color: '#fbbf24' },
          { label: 'ทั้งหมด', value: rooms.length, color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
          </div>
        ))}
        <button onClick={load} style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, marginLeft: 'auto',
        }}>🔄 รีเฟรช</button>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={thStyle}>ชื่อห้อง</th>
              <th style={thStyle}>Host</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>สถานะ</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>ผู้เล่น</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>เดิมพัน</th>
              <th style={thStyle}>สร้างเมื่อ</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 24 }}>กำลังโหลด...</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 24 }}>ไม่มีห้องในระบบ</td></tr>
            ) : rooms.map(r => (
              <tr key={r.id}>
                <td style={tdStyle}><span style={{ fontWeight: 600, color: 'white' }}>{r.name}</span></td>
                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }}>{r.host?.username ?? '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20,
                    background: `${STATUS_COLOR[r.status] ?? '#fff'}18`,
                    color: STATUS_COLOR[r.status] ?? 'white',
                    border: `1px solid ${STATUS_COLOR[r.status] ?? '#fff'}30`,
                  }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  {r.player_count}/{r.max_players}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.bet_credits > 0 ? '#C9A84C' : 'rgba(255,255,255,0.3)' }}>
                  {r.bet_credits > 0 ? `💎 ${r.bet_credits}` : 'ฟรี'}
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{formatDate(r.created_at)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => deleteRoom(r.id, r.name)}
                    disabled={deleting === r.id}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12,
                      background: 'rgba(248,113,113,0.1)', color: '#f87171',
                      border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                    }}>
                    {deleting === r.id ? '...' : '🗑️ ปิด'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>แสดง {rooms.length} รายการล่าสุด</div>
    </div>
  )
}
