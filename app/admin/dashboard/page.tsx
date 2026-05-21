'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'

interface Stats {
  totalRegistered: number
  totalPlayers: number
  activeRooms: number
  pendingCredits: number
  totalCreditsIssued: number
}

interface CreditReq {
  id: string
  user: { username: string }
  credits: number
  amount_thb: number
  package_label: string
  status: string
  created_at: string
}

function StatCard({ icon, label, value, color, sub, href }: {
  icon: string; label: string; value: number | string
  color: string; sub?: string; href?: string
}) {
  const content = (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 20px',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link>
  return content
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pending, setPending] = useState<CreditReq[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [s, c] = await Promise.all([
      authFetch('/api/admin/stats').then(r => r.json()),
      authFetch('/api/admin/credits?status=pending').then(r => r.json()),
    ])
    setStats(s)
    setPending(Array.isArray(c) ? c.slice(0, 5) : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCredit(id: string, action: 'approve' | 'reject') {
    await authFetch('/api/admin/credits', {
      method: 'PATCH',
      body: JSON.stringify({ id, action }),
    })
    load()
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#C9A84C', margin: 0 }}>📊 Dashboard</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>ภาพรวมระบบทั้งหมด</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 32 }}>กำลังโหลด...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
          <StatCard
            icon="🧑‍💻" label="ผู้สมัครสมาชิก" value={stats?.totalRegistered ?? 0}
            color="#34d399"
            sub="สมัครผ่าน Auth"
          />
          <StatCard
            icon="👥" label="มี Profile ครบ" value={stats?.totalPlayers ?? 0}
            color="#60a5fa" href="/admin/players"
            sub="มีข้อมูล user_profiles"
          />
          <StatCard
            icon="🏠" label="ห้องที่กำลังเล่น" value={stats?.activeRooms ?? 0}
            color="#4ade80" href="/admin/rooms"
          />
          <StatCard
            icon="⏳" label="รอ Approve Credits" value={stats?.pendingCredits ?? 0}
            color="#fbbf24" href="/admin/credits"
          />
          <StatCard
            icon="💎" label="Credits แจกทั้งหมด" value={(stats?.totalCreditsIssued ?? 0).toLocaleString()}
            color="#c084fc"
          />
        </div>
      )}

      {/* Pending credit requests */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>⏳ คำขอ Credits รอ Approve</h2>
          <Link href="/admin/credits" style={{ fontSize: 12, color: '#C9A84C', textDecoration: 'none' }}>ดูทั้งหมด →</Link>
        </div>

        {pending.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '20px', textAlign: 'center',
            color: 'rgba(255,255,255,0.3)', fontSize: 14,
          }}>
            ✅ ไม่มีคำขอที่รอ
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(cr => (
              <div key={cr.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{cr.user?.username ?? '?'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {cr.package_label} — ฿{cr.amount_thb} → {cr.credits} credits
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleCredit(cr.id, 'approve')}
                    style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    ✓ Approve
                  </button>
                  <button onClick={() => handleCredit(cr.id, 'reject')}
                    style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer', fontSize: 13 }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
