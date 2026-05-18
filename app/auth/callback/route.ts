import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  try {
    return NextResponse.redirect(new URL(decodeURIComponent(next), url.origin))
  } catch {
    return NextResponse.redirect(new URL('/dashboard', url.origin))
  }
}
