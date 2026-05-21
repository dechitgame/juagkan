'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface CreditReq {
  id: string
  user_id: string
  user: { username: string }
  credits: number
  amount_thb: number
  package_label: string
  status: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

const TABS = ['pending', 'approved', 'rejected'] as const
const TAB_LABEL: Record<string, string> = { pending: '⏳ รอดำเนินการ', approved: '✅ Approved', rejected: '❌ Rejected' }

export default function CreditsPage() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [items, setItems] = useState<CreditReq[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  async function load(status: string) {
    setLoading(true)
    const res = await authFetch(`/api/admin/credits?status=${status}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load(tab) }, [tab])

  async function handle(id: string, action: 'approve' | 'reject') {
    setActing(id)
    await authFetch('/api/admin/credits', {
      method: 'PATCH',
      body: JSON.stringify({ id, action }),
    })
    setActing(null)
    load(tab)
  }

  function formatDate(d: string | null) {
    if (!d) return '-'
    return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', margin: 0 }}>💎 จัดการ Credits</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>อนุมัติหรือปฏิเสธคำขอเติมเครดิต</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
            background: tab === t ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
            color: tab === t ? '#C9A84C' : 'rgba(255,255,255,0.45)',
            border: tab === t ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.08)',
            fontWeight: tab === t ? 600 : 400,
          }}>
            {TAB_LABEL[t]}
          </button>
        ))}
        <button onClick={() => load(tab)} style={{
          marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, fontSize: 13,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}>🔄</button>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={thStyle}>ผู้ใช้</th>
              <th style={thStyle}>แพ็กเกจ</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>ยอดชำระ</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Credits</th>
              <th style={thStyle}>วันที่ขอ</th>
              {tab !== 'pending' && <th style={thStyle}>ดำเนินการโดย</th>}
              {tab === 'pending' && <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 28 }}>กำลังโหลด...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 28 }}>
                {tab === 'pending' ? '✅ ไม่มีคำขอที่รอดำเนินการ' : 'ไม่มีรายการ'}
              </td></tr>
            ) : items.map(cr => (
              <tr key={cr.id}>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600, color: 'white' }}>{cr.user?.username ?? '?'}</span>
                </td>
                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }}>{cr.package_label}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>
                  ฿{cr.amount_thb.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#C9A84C', fontWeight: 700 }}>
                  💎 {cr.credits.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {formatDate(cr.created_at)}
                </td>
                {tab !== 'pending' && (
                  <td style={{ ...tdStyle, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    <div>{cr.reviewed_by ?? '-'}</div>
                    <div style={{ marginTop: 2 }}>{formatDate(cr.reviewed_at)}</div>
                  </td>
                )}
                {tab === 'pending' && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => handle(cr.id, 'approve')} disabled={acting === cr.id}
                        style={{
                          padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: 'rgba(74,222,128,0.15)', color: '#4ade80',
                          border: '1px solid rgba(74,222,128,0.3)', cursor: 'pointer',
                        }}>
                        {acting === cr.id ? '...' : '✓ Approve'}
                      </button>
                      <button onClick={() => handle(cr.id, 'reject')} disabled={acting === cr.id}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 13,
                          background: 'rgba(248,113,113,0.1)', color: '#f87171',
                          border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                        }}>
                        ✕
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{items.length} รายการ</div>
    </div>
  )
}
