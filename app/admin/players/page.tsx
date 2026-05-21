'use client'

import { useEffect, useState, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Player {
  id: string
  username: string
  credits: number
  total_wins: number
  total_losses: number
  created_at: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: string; credits: number } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const res = await authFetch(`/api/admin/players${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    setPlayers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  async function saveCredits() {
    if (!editing) return
    setSaving(true)
    await authFetch('/api/admin/players', {
      method: 'PATCH',
      body: JSON.stringify({ userId: editing.id, credits: editing.credits }),
    })
    setSaving(false)
    setEditing(null)
    load(search)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', margin: 0 }}>👥 ผู้เล่นทั้งหมด</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>จัดการบัญชีและ credits ของผู้เล่น</p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="ค้นหาชื่อผู้เล่น..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', outline: 'none',
          }}
        />
        <button onClick={() => load(search)} style={{
          padding: '10px 18px', borderRadius: 10, background: 'rgba(201,168,76,0.2)',
          border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', cursor: 'pointer', fontSize: 14,
        }}>ค้นหา</button>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={thStyle}>ชื่อผู้ใช้</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Credits</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>ชนะ</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>แพ้</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>W/L%</th>
              <th style={thStyle}>สมัคร</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 24 }}>กำลังโหลด...</td></tr>
            ) : players.length === 0 ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 24 }}>ไม่พบผู้เล่น</td></tr>
            ) : players.map(p => {
              const total = p.total_wins + p.total_losses
              const wr = total > 0 ? Math.round((p.total_wins / total) * 100) : 0
              const isEditing = editing?.id === p.id
              return (
                <tr key={p.id} style={{ transition: 'background 0.1s' }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: 'white' }}>{p.username}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isEditing ? (
                      <input
                        type="number" value={editing.credits}
                        onChange={e => setEditing({ ...editing, credits: Number(e.target.value) })}
                        style={{
                          width: 80, padding: '4px 8px', borderRadius: 6, fontSize: 13,
                          background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)',
                          color: '#C9A84C', textAlign: 'right', outline: 'none',
                        }}
                      />
                    ) : (
                      <span style={{ color: '#C9A84C', fontWeight: 700 }}>💎 {p.credits.toLocaleString()}</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#4ade80' }}>{p.total_wins}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#f87171' }}>{p.total_losses}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: wr >= 50 ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                    {total > 0 ? `${wr}%` : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={saveCredits} disabled={saving}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', cursor: 'pointer', fontSize: 12 }}>
                          {saving ? '...' : 'บันทึก'}
                        </button>
                        <button onClick={() => setEditing(null)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 12 }}>
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditing({ id: p.id, credits: p.credits })}
                        style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer', fontSize: 12 }}>
                        ✏️ Credits
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>แสดง {players.length} รายการ</div>
    </div>
  )
}
