'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { promptPayQrUrl } from '@/lib/promptpay'

const PACKAGES = [
  { credits: 100,  price: 29,   label: '🌱 เริ่มต้น' },
  { credits: 500,  price: 99,   label: '🚀 มาตรฐาน', popular: true },
  { credits: 2000, price: 349,  label: '⚡ Pro' },
  { credits: 5000, price: 799,  label: '👑 VIP' },
]

export default function CreditsPage() {
  const [selected, setSelected] = useState(PACKAGES[1])
  const [promptpayNumber, setPromptpayNumber] = useState<string>('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [myCredits, setMyCredits] = useState<number | null>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const sb = createBrowserClient()
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: profile } = await sb.from('user_profiles').select('credits').eq('id', user.id).single()
      setMyCredits(profile?.credits ?? 0)

      const { data: cfg } = await sb.from('system_config').select('value').eq('key', 'promptpay_number').single()
      if (cfg?.value) setPromptpayNumber(cfg.value)

      const { data: reqs } = await sb.from('credit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      setHistory(reqs ?? [])
    }
    load()
  }, [])

  async function submitTopup() {
    if (!slipFile) { alert('กรุณาแนบสลิป'); return }
    setSending(true)
    const sb = createBrowserClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      const { error } = await sb.from('credit_requests').insert({
        user_id: user.id,
        credits: selected.credits,
        amount_thb: selected.price,
        package_label: selected.label,
        slip_url: null,
        status: 'pending',
      })
      setSending(false)
      if (!error) setDone(true)
    }
    reader.readAsDataURL(slipFile)
  }

  const qrUrl = promptpayNumber ? promptPayQrUrl(promptpayNumber, selected.price) : null

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">💎 เติมเครดิต</h1>
          <Link href="/dashboard" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>← กลับ</Link>
        </div>

        {myCredits !== null && (
          <div className="card-glass p-4 flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>เครดิตปัจจุบัน</p>
              <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{myCredits}</p>
            </div>
          </div>
        )}

        {done ? (
          <div className="card-glass p-6 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-white">ส่งคำขอแล้ว!</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Admin จะตรวจสอบและเพิ่มเครดิตให้ภายใน 30 นาที
            </p>
            <button onClick={() => setDone(false)} className="btn-outline text-sm">เติมอีกครั้ง</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.credits}
                  onClick={() => setSelected(pkg)}
                  className="card-glass p-3 text-left relative transition-all"
                  style={{
                    borderColor: selected === pkg ? 'var(--gold)' : 'var(--border)',
                    border: '1px solid',
                  }}
                >
                  {pkg.popular && (
                    <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(201,168,76,0.2)', color: 'var(--gold)' }}>HOT</span>
                  )}
                  <p className="font-semibold text-white">{pkg.label}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>💎 {pkg.credits}</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>฿{pkg.price}</p>
                </button>
              ))}
            </div>

            {qrUrl && (
              <div className="card-glass p-4 flex flex-col items-center gap-3">
                <p className="text-sm font-medium" style={{ color: 'var(--gold)' }}>
                  สแกน PromptPay ฿{selected.price}
                </p>
                <img src={qrUrl} alt="PromptPay QR" width={180} height={180} className="rounded-xl" />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{promptpayNumber}</p>
              </div>
            )}

            <div className="card-glass p-4 space-y-3">
              <p className="text-sm font-medium text-white">แนบสลิปการโอน</p>
              <input
                type="file"
                accept="image/*"
                onChange={e => setSlipFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.5rem' }}
              />
              <button
                onClick={submitTopup}
                disabled={sending || !slipFile}
                className="btn-gold w-full"
              >
                {sending ? '⏳ กำลังส่ง…' : `ยืนยันเติม ${selected.credits} เครดิต`}
              </button>
            </div>
          </>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">ประวัติการเติม</p>
            {history.map(req => (
              <div key={req.id} className="card-glass p-3 flex justify-between text-sm">
                <span className="text-white">{req.package_label} · 💎 {req.credits}</span>
                <span style={{
                  color: req.status === 'approved' ? '#4ade80' : req.status === 'rejected' ? '#f87171' : 'rgba(255,255,255,0.4)'
                }}>
                  {req.status === 'approved' ? '✅ อนุมัติ' : req.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รอตรวจ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
