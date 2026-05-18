import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = createServiceClient()
  const { data } = await sb
    .from('game_rooms')
    .select('id, name, max_players, bet_credits, status, player_count, created_at, host:user_profiles!host_id(username)')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(30)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, max_players = 4, bet_credits = 0 } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ต้องระบุชื่อห้อง' }, { status: 400 })

  if (bet_credits > 0) {
    const sb = createServiceClient()
    const { data: profile } = await sb.from('user_profiles').select('credits').eq('id', user.id).single()
    if ((profile?.credits ?? 0) < bet_credits) {
      return NextResponse.json({ error: 'เครดิตไม่พอ' }, { status: 400 })
    }
  }

  const sb = createServiceClient()
  const { data, error } = await sb.from('game_rooms').insert({
    name: name.trim(),
    host_id: user.id,
    max_players,
    bet_credits,
    status: 'waiting',
    player_count: 1,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('room_members').insert({ room_id: data.id, user_id: user.id, seat_index: 0 })

  return NextResponse.json({ id: data.id })
}
