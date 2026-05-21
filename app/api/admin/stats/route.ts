import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

async function guard(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const sb = createServiceClient()
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export async function GET(req: NextRequest) {
  if (!await guard(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sb = createServiceClient()

  const [
    { count: totalProfiles },
    { count: activeRooms },
    { count: pendingCredits },
    { data: creditSum },
    authUsersResult,
  ] = await Promise.all([
    sb.from('user_profiles').select('*', { count: 'exact', head: true }),
    sb.from('game_rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
    sb.from('credit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('credit_requests').select('credits').eq('status', 'approved'),
    // นับ auth users ทั้งหมด (คนที่สมัครจริง)
    sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const totalRegistered = authUsersResult.data?.users?.length ?? 0
  const totalCreditsIssued = (creditSum ?? []).reduce((s: number, r: any) => s + (r.credits ?? 0), 0)

  return NextResponse.json({
    totalRegistered,           // คนสมัครจริง (auth.users)
    totalPlayers: totalProfiles ?? 0, // มี profile ครบ
    activeRooms: activeRooms ?? 0,
    pendingCredits: pendingCredits ?? 0,
    totalCreditsIssued,
  })
}
