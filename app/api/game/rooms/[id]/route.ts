import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = createServiceClient()
  const { data } = await sb
    .from('game_rooms')
    .select('*, host:user_profiles!host_id(username), members:room_members(user_id, seat_index, profile:user_profiles!user_id(username))')
    .eq('id', id)
    .single()
  if (!data) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const sb = createServiceClient()

  const { data: room } = await sb.from('game_rooms').select('host_id').eq('id', id).single()
  if (!room) return NextResponse.json({ error: 'ไม่พบห้อง' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'เฉพาะเจ้าของห้อง' }, { status: 403 })

  const allowed = ['state', 'status']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { error } = await sb.from('game_rooms').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  await sb.from('room_members').delete().eq('room_id', id).eq('user_id', user.id)
  const { data: room } = await sb.from('game_rooms').select('host_id, player_count').eq('id', id).single()
  if (room) {
    if (room.host_id === user.id) {
      await sb.from('game_rooms').delete().eq('id', id)
    } else {
      await sb.from('game_rooms').update({ player_count: Math.max(0, (room.player_count ?? 1) - 1) }).eq('id', id)
    }
  }
  return NextResponse.json({ ok: true })
}
