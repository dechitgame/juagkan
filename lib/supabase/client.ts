import { createClient } from '@supabase/supabase-js'

export function createBrowserClient() {
  // trim + ลบอักขระที่ไม่ใช่ ASCII ออก ป้องกัน ISO-8859-1 fetch error
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '') // เก็บเฉพาะ printable ASCII

  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
}
