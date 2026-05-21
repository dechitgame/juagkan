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

// GET — รายการ credit requests
export async function GET(req: NextRequest) {
  const admin = await guard(req)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  const sb = createServiceClient()

  const { data } = await sb
    .from('credit_requests')
    .select('id, user_id, credits, amount_thb, package_label, status, created_at, reviewed_at, reviewed_by, user:user_profiles!user_id(username)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}

// PATCH — approve / reject
export async function PATCH(req: NextRequest) {
  const admin = await guard(req)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id, action } = await req.json() // action: 'approve' | 'reject'
  if (!id || !action) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const sb = createServiceClient()
  const { data: cr } = await sb.from('credit_requests').select('*').eq('id', id).single()
  if (!cr) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 })
  if (cr.status !== 'pending') return NextResponse.json({ error: 'คำขอนี้ดำเนินการไปแล้ว' }, { status: 400 })

  const now = new Date().toISOString()

  if (action === 'approve') {
    await sb.from('credit_requests').update({ status: 'approved', reviewed_at: now, reviewed_by: admin.email }).eq('id', id)
    const { data: profile } = await sb.from('user_profiles').select('credits').eq('id', cr.user_id).single()
    await sb.from('user_profiles').update({ credits: (profile?.credits ?? 0) + cr.credits }).eq('id', cr.user_id)
  } else {
    await sb.from('credit_requests').update({ status: 'rejected', reviewed_at: now, reviewed_by: admin.email }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
