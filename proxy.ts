import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/dashboard', '/lobby', '/room', '/leaderboard', '/credits']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
  if (!needsAuth) return NextResponse.next()

  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/lobby/:path*', '/room/:path*', '/leaderboard/:path*', '/credits/:path*'],
}
