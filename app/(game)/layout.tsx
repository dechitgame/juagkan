'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GameNav from '@/components/GameNav'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    try {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
        .replace('https://', '').split('.')[0]
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (!raw) { router.replace('/login'); return }

      const session = JSON.parse(raw)
      const now = Math.floor(Date.now() / 1000)

      if (!session?.access_token || !session?.user?.id) {
        router.replace('/login'); return
      }
      if (session.expires_at && session.expires_at < now) {
        router.replace('/login'); return
      }
    } catch {
      router.replace('/login')
    }
  }, [])

  return (
    <>
      <GameNav />
      {children}
    </>
  )
}
