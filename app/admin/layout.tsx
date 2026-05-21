'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'
import Link from 'next/link'

const NAV = [
  { href: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/players',   icon: '👥', label: 'ผู้เล่น' },
  { href: '/admin/rooms',     icon: '🏠', label: 'ห้องเกม' },
  { href: '/admin/credits',   icon: '💎', label: 'Credits' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        .replace('https://', '').split('.')[0]
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (!raw) { router.replace('/lobby'); return }
      const session = JSON.parse(raw)
      const email = session?.user?.email ?? ''
      if (!email || !isAdminEmail(email)) { router.replace('/lobby'); return }
      setAdminEmail(email)
      setReady(true)
    } catch {
      router.replace('/lobby')
    }
  }, [])

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ fontSize: 32, animation: 'pulse 1s infinite' }}>👑</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A', color: 'white' }}>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside style={{
        width: 200, flexShrink: 0,
        background: 'rgba(255,255,255,0.025)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>ADMIN PANEL</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>🃏 จั่วกัน</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {adminEmail}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none',
                background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: active ? '#C9A84C' : 'rgba(255,255,255,0.55)',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
                border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/lobby" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            ← กลับ Lobby
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
