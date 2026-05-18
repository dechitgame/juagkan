import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

// GET — ดูประวัติ / POST — ขอเติมเครดิต
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const { data } = await sb
    .from('credit_requests')
    .select('id, credits, amount_thb, package_label, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { credits, amount_thb, package_label } = await req.json()
  if (!credits || !amount_thb || !package_label) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
  }

  const sb = createServiceClient()
  const { data, error } = await sb.from('credit_requests').insert({
    user_id: user.id,
    credits,
    amount_thb,
    package_label,
    status: 'pending',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// Admin: PATCH /api/credits?action=approve&id=xxx
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const { data: cfg } = await sb.from('system_config').select('value').eq('key', 'admin_email').single()
  const adminEmail = cfg?.value ?? process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
  if (user.email !== adminEmail) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id, action } = await req.json() // action: 'approve' | 'reject'
  const { data: req_ } = await sb.from('credit_requests').select('*').eq('id', id).single()
  if (!req_) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 })

  if (action === 'approve') {
    await sb.from('credit_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.email }).eq('id', id)
    await sb.rpc('add_credits', { p_user_id: req_.user_id, p_amount: req_.credits })
  } else {
    await sb.from('credit_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.email }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
