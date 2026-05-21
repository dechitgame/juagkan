'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'

export default function GameNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState('')
  const [credits, setCredits] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // อ่าน session จาก localStorage ตรงๆ (เร็ว + ไม่ขึ้นกับ token refresh)
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
          .replace('https://', '').split('.')[0]
        const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
        if (!raw) return
        const session = JSON.parse(raw)
        const user = session?.user
        if (!user?.id) return

        // เช็ค admin จาก email
        const email = user.email ?? ''
        setIsAdmin(isAdminEmail(email))

        // แสดงชื่อจาก metadata ก่อน (เร็ว)
        const displayName = user.user_metadata?.name
          ?? user.user_metadata?.username
          ?? email.split('@')[0]
          ?? 'ผู้เล่น'
        setUsername(displayName)

        // โหลด profile จาก Supabase
        const sb = createBrowserClient()
        const { data } = await sb
          .from('user_profiles')
          .select('username, credits')
          .eq('id', user.id)
          .single()

        if (data) {
          setUsername(data.username ?? displayName)
          setCredits(data.credits ?? 0)
        }
      } catch {}
    }
    load()
  }, [pathname])

  function handleLogout() {
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        .replace('https://', '').split('.')[0]
      localStorage.removeItem(`sb-${projectRef}-auth-token`)
    } catch {}
    router.replace('/login')
  }

  const links = [
    { href: '/lobby',       icon: '🌐', label: 'ห้องเกม' },
    { href: '/dashboard',   icon: '👤', label: 'โปรไฟล์' },
    { href: '/leaderboard', icon: '🏆', label: 'อันดับ' },
  ]

  return (
    <nav style={{
      background: 'rgba(10,10,10,0.95)',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
      backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 50,
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* Logo */}
        <Link href="/lobby" style={{ color: 'var(--gold2)', fontWeight: 800, fontSize: 15, flexShrink: 0, textDecoration: 'none' }}>
          🃏 <span className="hidden xs:inline">จั่วกัน</span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: 2 }}>
          {links.map(l => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href}
                style={{
                  padding: '5px 8px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  color: active ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                  textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3,
                }}>
                <span>{l.icon}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            )
          })}
          {isAdmin && (
            <Link href="/admin"
              style={{
                padding: '5px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                color: pathname.startsWith('/admin') ? '#000' : '#C9A84C',
                background: pathname.startsWith('/admin')
                  ? 'linear-gradient(135deg,#C9A84C,#D4AF37)'
                  : 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.35)',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
              👑
            </Link>
          )}
        </div>

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {credits !== null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>
              💎 {credits}
            </span>
          )}
          {username && (
            <span className="hidden sm:block" style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </span>
          )}
          <button onClick={handleLogout}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }}>
            ออก
          </button>
        </div>
      </div>
    </nav>
  )
}
