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

// GET — ดูห้องทั้งหมด
export async function GET(req: NextRequest) {
  if (!await guard(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sb = createServiceClient()
  const { data } = await sb
    .from('game_rooms')
    .select('id, name, status, max_players, player_count, bet_credits, created_at, host:user_profiles!host_id(username)')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}

// DELETE — ปิดห้องบังคับ
export async function DELETE(req: NextRequest) {
  if (!await guard(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { roomId } = await req.json()
  if (!roomId) return NextResponse.json({ error: 'ต้องระบุ roomId' }, { status: 400 })

  const sb = createServiceClient()
  await sb.from('room_members').delete().eq('room_id', roomId)
  await sb.from('game_rooms').delete().eq('id', roomId)

  return NextResponse.json({ ok: true })
}
