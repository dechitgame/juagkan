'use client'

/** ดึง access token จาก localStorage */
export function getAccessToken(): string | null {
  try {
    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      .replace('https://', '').split('.')[0]
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.access_token ?? null
  } catch {
    return null
  }
}

/** fetch ที่แนบ Authorization: Bearer token อัตโนมัติ */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
