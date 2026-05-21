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

// GET — รายชื่อผู้เล่นทั้งหมด
export async function GET(req: NextRequest) {
  if (!await guard(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const search = req.nextUrl.searchParams.get('q') ?? ''
  const sb = createServiceClient()

  let query = sb
    .from('user_profiles')
    .select('id, username, credits, total_wins, total_losses, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) query = query.ilike('username', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PATCH — แก้ไข credits ผู้เล่น
export async function PATCH(req: NextRequest) {
  if (!await guard(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { userId, credits } = await req.json()
  if (!userId || credits == null) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const sb = createServiceClient()
  const { error } = await sb
    .from('user_profiles')
    .update({ credits: Math.max(0, credits) })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
