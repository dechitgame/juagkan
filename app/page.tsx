import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  if (params.code) redirect(`/auth/callback?code=${params.code}`)
  return <HomeContent />
}

function HomeContent() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center safe-bottom"
      style={{ background: 'radial-gradient(ellipse 60% 50% at 50% -5%, rgba(201,168,76,0.15), transparent), #0A0A0A' }}
    >
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--gold2)' }}>🃏</h1>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--gold2)' }}>จั่วกัน</h1>
          <p className="mt-2 text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
            เกมดัมมี่ไทย เล่นกับเพื่อนทั่วไทย
          </p>
        </div>

        <div className="card-glass p-5 space-y-3">
          <Link href="/play" className="btn-gold w-full block text-center py-4 text-lg">
            🎴 เล่นเดี๋ยวนี้เลย
          </Link>
          <Link
            href="/login"
            className="block w-full py-4 rounded-xl text-base font-medium border transition-all text-center"
            style={{ borderColor: 'rgba(201,168,76,0.3)', color: 'var(--gold)' }}
          >
            🏆 ห้องเล่นออนไลน์ (ต้อง Login)
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '♠', label: 'เล่นได้ทันที', sub: 'ไม่ต้องสมัคร' },
            { icon: '♥', label: 'เพื่อน 4 คน', sub: 'สูงสุด 4 คน' },
            { icon: '♦', label: 'เดิมพัน', sub: 'เครดิตจริง' },
          ].map(item => (
            <div key={item.label} className="card-glass p-3">
              <div className="text-2xl mb-1" style={{ color: 'var(--gold)' }}>{item.icon}</div>
              <div className="text-xs font-medium text-white">{item.label}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          กติกาดัมมี่มาตรฐาน 13 ใบ · จั่ว ลง ทิ้ง
        </p>
      </div>
    </main>
  )
}
