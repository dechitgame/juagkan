'use client'

import { useReducer, useEffect, useState, useMemo, useRef } from 'react'
import { gameReducer, initGame } from '@/lib/game/gameEngine'
import { computeAIActions, computePostDrawActions } from '@/lib/game/aiPlayer'
import { canDiscardBePickedForMeld } from '@/lib/game/meldValidator'
import { findKnockResult } from '@/lib/game/meldValidator'
import { pickCharacters, Character } from '@/lib/game/characters'
import { GameState, Card, Meld } from '@/types/game'
import CardComponent from '@/components/game/Card'
import { CornerFiligree, Crown, SpetoBadge } from '@/components/game/Ornaments'
import Link from 'next/link'

// ─── Owner colors per seat ──────────────────────────────────────────────
const OWNER_COLORS = ['#1a3a8a', '#7a4808', '#7a0f1f', '#0f5a3a']

// ─── Web Audio sound effects ────────────────────────────────────────────
function playSound(type: 'select' | 'card' | 'discard' | 'deal' | 'knock' | 'win') {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    const ctx: AudioContext = new AC()
    const t = ctx.currentTime
    const tone = (freq: number, wave: OscillatorType, dur: number, vol = 0.22, start = 0) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = wave
      osc.frequency.setValueAtTime(freq, t + start)
      gain.gain.setValueAtTime(vol, t + start)
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur)
      osc.start(t + start); osc.stop(t + start + dur + 0.02)
    }
    switch (type) {
      case 'select':  tone(680, 'sine', 0.06, 0.12); break
      case 'deal':    tone(520, 'triangle', 0.07, 0.18); tone(260, 'sine', 0.06, 0.08, 0.03); break
      case 'card':    tone(480, 'triangle', 0.09, 0.22); tone(240, 'sine', 0.1, 0.1, 0.02); break
      case 'discard': tone(260, 'triangle', 0.14, 0.28); tone(160, 'sine', 0.16, 0.12, 0.03); break
      case 'knock':
        [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.38, 0.28, i * 0.1))
        tone(1047, 'sine', 0.5, 0.2, 0.35); break
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'sine', 0.55, 0.28, i * 0.11))
        setTimeout(() => [784, 1047, 1319, 1568].forEach((f, i) => tone(f, 'triangle', 0.4, 0.18, i * 0.08)), 700)
        break
    }
  } catch {}
}

// ─── Hidden hand (overlapping card backs) ───────────────────────────────
function HiddenHand({ count, compact = false }: { count: number; compact?: boolean }) {
  const n = Math.min(count, compact ? 5 : 8)
  const W = compact ? 14 : 18
  const H = compact ? 20 : 26
  const OL = compact ? 8 : 10

  if (n === 0) return (
    <div style={{ width: W + OL * 4, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 8, color: 'rgba(212,168,74,.4)', border: '1px dashed rgba(212,168,74,.3)', borderRadius: 2, padding: '1px 4px' }}>✓</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', position: 'relative', height: H, width: W + OL * (n - 1) }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: i * OL, width: W, height: H, borderRadius: 3,
          background: 'radial-gradient(ellipse at 30% 30%, #2a4f8a 0%, #0a1f4d 50%, #03102a 100%)',
          border: '1px solid #5a4318', zIndex: i,
          boxShadow: '0 1px 3px rgba(0,0,0,.6)',
        }}>
          <div style={{
            position: 'absolute', inset: 2, borderRadius: 2,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,168,74,.2) 0 1px, transparent 1px 4px)',
          }} />
        </div>
      ))}
    </div>
  )
}

// ─── Action button (hand strip) ─────────────────────────────────────────
function ActionBtn({ label, flex, enabled, activeStyle = {}, pulse = false, onClick }: {
  label: string; flex?: number; enabled: boolean
  activeStyle?: React.CSSProperties; pulse?: boolean; onClick: () => void
}) {
  const base: React.CSSProperties = {
    flex, padding: '7px 0', fontSize: 14, fontWeight: 800,
    fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
    borderRadius: 6, border: '1px solid #4a3608', cursor: enabled ? 'pointer' : 'default',
    background: 'linear-gradient(180deg,#f3d77a,#d4a84a 50%,#8a6418)',
    color: '#1a1006',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.5)',
    transition: 'filter .1s, transform .08s',
    opacity: enabled ? 1 : 0.38,
    letterSpacing: '.02em',
    animation: pulse ? 'pulse .9s ease-in-out infinite' : 'none',
    outline: 'none',
    ...(enabled ? activeStyle : {}),
  }
  return <button disabled={!enabled} style={base} onClick={onClick}>{label}</button>
}

// ─── Meld group on the felt rail ────────────────────────────────────────
function RoyalMeldGroup({ meld, ownerInitial, ownerColor, canFak, onFak, flash }: {
  meld: Meld; ownerInitial: string; ownerColor: string
  canFak: boolean; onFak: () => void; flash: boolean
}) {
  return (
    <div onClick={canFak ? onFak : undefined} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '4px 6px 5px', borderRadius: 6, flexShrink: 0,
      background: canFak ? 'rgba(212,168,74,.15)' : 'rgba(0,0,0,.2)',
      border: `1px solid ${canFak ? 'rgba(212,168,74,.55)' : 'rgba(212,168,74,.2)'}`,
      cursor: canFak ? 'pointer' : 'default',
      boxShadow: flash ? '0 0 0 2px #f3d77a, 0 0 12px #f3d77a' : (canFak ? '0 2px 8px rgba(212,168,74,.2)' : 'none'),
      transition: 'box-shadow .4s, background .2s',
    }}>
      {/* Owner badge + type label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <div style={{
          width: 13, height: 13, borderRadius: 999, background: ownerColor,
          border: '1px solid #d4a84a', display: 'grid', placeItems: 'center',
          fontSize: 6, fontWeight: 800, color: '#f3d77a', fontFamily: '"Cinzel", serif',
        }}>{ownerInitial}</div>
        <span style={{ fontSize: 8, color: '#e6c275', fontFamily: 'var(--th-body)', fontWeight: 600 }}>
          {meld.type === 'set' ? 'ตอง' : 'เรียง'}
        </span>
      </div>
      {/* Mini cards overlapping */}
      <div style={{ display: 'flex' }}>
        {meld.cards.map((c, ci) => (
          <div key={`${c.id}-${ci}`} style={{ marginLeft: ci === 0 ? 0 : -9 }}>
            <CardComponent card={c} small />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Confetti ────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 2.8,
    dur: 1.6 + Math.random() * 2.2,
    color: ['#D4AF37','#F5D070','#f87171','#4ade80','#60a5fa','#c084fc','#fb923c','#ffffff'][i % 8],
    size: 5 + Math.random() * 9, rot: Math.floor(Math.random() * 360), shape: i % 3,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -24,
          width: p.size, height: p.shape === 1 ? p.size * 0.45 : p.size,
          background: p.color,
          borderRadius: p.shape === 0 ? '50%' : '2px',
          transform: `rotate(${p.rot}deg)`,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Start screen ────────────────────────────────────────────────────────
function StartScreen({ onSearch }: { onSearch: (count: 1 | 2 | 3) => void }) {
  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a0e07 0%, #0a0907 70%, #000 100%)',
      padding: '20px 16px', fontFamily: 'var(--th-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontFamily: 'var(--en-body)', fontWeight: 600, letterSpacing: '.3em', color: '#c8b88a', marginBottom: 2, textTransform: 'uppercase' }}>Royal Edition</div>
          <h1 style={{ fontSize: 42, fontWeight: 700, fontFamily: 'var(--th-display)', color: '#f3d77a', margin: 0, lineHeight: 1.1,
            textShadow: '0 0 32px rgba(212,168,74,.4), 0 2px 4px rgba(0,0,0,.8)' }}>ดัมมี่</h1>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <div style={{ height: 1, width: 120, background: 'linear-gradient(90deg, transparent, #d4a84a 30%, #f3d77a 50%, #d4a84a 70%, transparent)' }} />
          </div>
          <p style={{ marginTop: 10, fontSize: 13, color: '#c8b88a', fontFamily: 'var(--th-body)' }}>จับคู่กับผู้เล่นทั่วประเทศ</p>
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            { count: 1 as const, label: '2 คน', sub: 'แจกคนละ 11 ใบ' },
            { count: 2 as const, label: '3 คน', sub: 'แจกคนละ 9 ใบ' },
            { count: 3 as const, label: '4 คน', sub: 'แจกคนละ 7 ใบ' },
          ] as const).map(({ count, label, sub }) => (
            <button key={count} onClick={() => onSearch(count)} className="btn-brass"
              style={{ padding: '14px 20px', fontSize: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span>🎴 {label}</span>
              <span style={{ fontSize: 11, opacity: 0.65, fontFamily: 'var(--th-body)' }}>{sub}</span>
            </button>
          ))}
        </div>

        <Link href="/lobby" style={{ display: 'block', marginTop: 20, fontSize: 13, color: '#c8b88a', textDecoration: 'none', opacity: 0.6 }}>← กลับ Lobby</Link>
      </div>
    </main>
  )
}

// ─── Matchmaking screen ──────────────────────────────────────────────────
function MatchmakingScreen({ count, characters, onReady }: { count: number; characters: Character[]; onReady: () => void }) {
  const [found, setFound] = useState<Character[]>([])
  useEffect(() => {
    characters.forEach((c, i) => setTimeout(() => setFound(p => [...p, c]), 1200 + i * 1500))
    setTimeout(onReady, 1200 + characters.length * 1500 + 900)
  }, [])
  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a0e07 0%, #0a0907 70%, #000 100%)',
      padding: '16px', fontFamily: 'var(--th-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }}>🔍</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--th-display)', color: '#f3d77a', margin: '0 0 4px' }}>กำลังจับคู่...</h2>
        <p style={{ fontSize: 13, color: '#c8b88a', margin: '0 0 20px' }}>ค้นหาผู้เล่น {count} คนในประเทศไทย</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {found.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              background: 'rgba(212,168,74,.08)', border: '1px solid rgba(212,168,74,.25)',
              borderRadius: 10, animation: 'royalFadeIn .4s ease',
            }}>
              <span style={{ fontSize: 24 }}>{c.avatar}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#f3d77a', fontSize: 14, fontFamily: 'var(--th-display)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#c8b88a' }}>อายุ {c.age} ปี · {c.region}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 16 }}>✓</span>
            </div>
          ))}
          {found.length < count && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              background: 'rgba(0,0,0,.3)', border: '1px solid rgba(212,168,74,.1)',
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 24, animation: 'pulse 1s infinite' }}>⏳</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', animation: 'pulse 1s infinite' }}>กำลังค้นหา...</span>
            </div>
          )}
        </div>
        {found.length === count && <p style={{ marginTop: 16, color: '#4ade80', fontWeight: 700, animation: 'pulse 1s infinite' }}>✓ จับคู่สำเร็จ!</p>}
      </div>
      <style>{`@keyframes royalFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </main>
  )
}

// ─── Game Over screen ────────────────────────────────────────────────────
function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const winner = state.winner !== null ? state.players[state.winner] : null
  const isPlayerWin = state.winner === 0
  const specialKnock = state.isDarkKnock || state.isColorKnock

  useEffect(() => {
    const delay = setTimeout(() => playSound('win'), 200)
    return () => clearTimeout(delay)
  }, [])

  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a0e07 0%, #0a0907 70%, #000 100%)',
      padding: '16px', position: 'relative', overflow: 'hidden', fontFamily: 'var(--th-body)',
    }}>
      {isPlayerWin && <Confetti />}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 12, animation: 'winPop .6s cubic-bezier(.175,.885,.32,1.275) both' }}>
          {isPlayerWin ? '🏆' : '👏'}
        </div>

        <div style={{
          background: 'linear-gradient(180deg, rgba(20,12,6,.95), rgba(10,6,3,.98))',
          border: `2px solid ${isPlayerWin ? 'rgba(212,168,74,.5)' : 'rgba(255,255,255,.1)'}`,
          borderRadius: 18, padding: '18px 20px 16px',
          boxShadow: isPlayerWin ? '0 0 40px rgba(212,168,74,.2), 0 12px 40px rgba(0,0,0,.8)' : '0 12px 40px rgba(0,0,0,.8)',
          animation: 'winPop .6s .15s cubic-bezier(.175,.885,.32,1.275) both',
        }}>
          {specialKnock && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10,
              background: state.isDarkKnock && state.isColorKnock ? 'linear-gradient(135deg,#3b0764,#7c3aed)' : state.isDarkKnock ? 'linear-gradient(135deg,#1c1c2e,#4c1d95)' : 'linear-gradient(135deg,#0f3460,#1e40af)',
              color: '#e9d5ff', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
              boxShadow: '0 2px 12px rgba(124,58,237,.5)',
            }}>
              {state.isDarkKnock && state.isColorKnock ? '🌑🎨 น็อคมืดสี!' : state.isDarkKnock ? '🌑 น็อคมืด!' : '🎨 น็อคสี!'}
              {state.knockMultiplier > 1 && ` ×${state.knockMultiplier}`}
            </div>
          )}

          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--th-display)', color: isPlayerWin ? '#D4AF37' : 'rgba(255,255,255,.9)', marginBottom: 4 }}>
            {winner?.name ?? '?'}
          </div>
          <div style={{ fontSize: 13, color: isPlayerWin ? 'rgba(212,168,74,.7)' : 'rgba(255,255,255,.4)', marginBottom: 14 }}>
            {isPlayerWin ? '🎉 ชนะแล้ว!' : 'ชนะในรอบนี้'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {state.players.map((p, i) => {
              const rs = state.roundScores[i] ?? 0
              const isWinner = i === state.winner
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 12px', borderRadius: 10,
                  background: isWinner ? 'rgba(212,168,74,.1)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${isWinner ? 'rgba(212,168,74,.25)' : 'rgba(255,255,255,.06)'}`,
                }}>
                  <span style={{ fontSize: 13, color: isWinner ? '#F5D070' : 'rgba(255,255,255,.6)', fontWeight: isWinner ? 700 : 400 }}>
                    {isWinner && '👑 '}{p.name.split(' ')[0].substring(0, 10)}
                  </span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: rs > 0 ? '#4ade80' : rs < 0 ? '#f87171' : 'rgba(255,255,255,.3)' }}>
                      {rs > 0 ? '+' : ''}{rs}
                    </span>
                    {p.score !== 0 && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginLeft: 5 }}>
                        (รวม {p.score > 0 ? '+' : ''}{p.score})
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onRestart} className="btn-brass" style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 15, fontWeight: 800 }}>🎴 เล่นใหม่</button>
            <Link href="/lobby" style={{
              flex: 1, padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 14,
              background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)',
              border: '1px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
            }}>← Lobby</Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes winPop{0%{transform:scale(.4) translateY(30px);opacity:0}60%{transform:scale(1.08) translateY(-4px)}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}80%{opacity:.8}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}
      `}</style>
    </main>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Main PlayPage
// ══════════════════════════════════════════════════════════════════════════
export default function PlayPage() {
  const [screen, setScreen] = useState<'start' | 'matching' | 'game'>('start')
  const [aiCount, setAiCount] = useState<1 | 2 | 3>(1)
  const [characters, setCharacters] = useState<Character[]>([])
  const [aiThinking, setAiThinking] = useState(false)
  const [aiThinkMsg, setAiThinkMsg] = useState('')
  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState)
  const [cardOrder, setCardOrder] = useState<string[]>([])
  const [dealing, setDealing] = useState(false)
  const [toast, setToast] = useState('')
  const [flashMeldId, setFlashMeldId] = useState<string | null>(null)
  const [lastDrawnCardId, setLastDrawnCardId] = useState<string | null>(null)
  const prevHandRef = useRef<Set<string>>(new Set())
  const prevLogLenRef = useRef(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Fullscreen helpers ────────────────────────────────────────────────
  function requestFS() {
    const el = document.documentElement as any
    try {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen)?.call(el)
    } catch {}
  }
  function exitFS() {
    const doc = document as any
    try {
      (doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen)?.call(doc)
    } catch {}
  }
  function toggleFS() { if (isFullscreen) exitFS(); else requestFS() }

  // ── Landscape lock + auto-fullscreen ─────────────────────────────────
  useEffect(() => {
    if (screen === 'game') {
      ;(async () => { try { await (window.screen as any).orientation.lock('landscape') } catch {} })()
    }
    return () => {
      if (screen === 'game') { try { (window.screen as any).orientation.unlock() } catch {} }
    }
  }, [screen])

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // re-request fullscreen ถ้า user ออกจาก fullscreen แล้วหมุนกลับมา landscape
  // (ใช้ orientationchange แทน resize เพราะ Chrome trigger ได้จาก gesture)
  useEffect(() => {
    if (screen !== 'game') return
    const onOrient = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      if (isLandscape && !document.fullscreenElement) requestFS()
    }
    window.addEventListener('orientationchange', onOrient)
    return () => window.removeEventListener('orientationchange', onOrient)
  }, [screen])

  // ── Toast from game log ────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return
    if (state.log.length > prevLogLenRef.current) {
      const msg = state.log[state.log.length - 1]
      if (msg) {
        setToast(msg)
        setTimeout(() => setToast(''), 2200)
      }
      prevLogLenRef.current = state.log.length
    }
  }, [state?.log?.length])

  // ── Track last drawn card ─────────────────────────────────────────────
  useEffect(() => {
    if (!state) return
    const currentIds = new Set(state.players[0].hand.map(c => c.id))
    const added = [...currentIds].find(id => !prevHandRef.current.has(id))
    if (added) { setLastDrawnCardId(added); setTimeout(() => setLastDrawnCardId(null), 3000) }
    prevHandRef.current = currentIds
  }, [state?.players[0]?.hand.length])

  // ── Flash meld when new meld appears ─────────────────────────────────
  useEffect(() => {
    if (!state) return
    const ids = state.tableMelds.map(m => m.id)
    if (ids.length > 0) {
      const newest = ids[ids.length - 1]
      setFlashMeldId(newest)
      setTimeout(() => setFlashMeldId(null), 700)
    }
  }, [state?.tableMelds?.length])

  function handleSearch(count: 1 | 2 | 3) {
    requestFS()   // user tap → fullscreen ได้ทันที
    setAiCount(count); setCharacters(pickCharacters(count)); setScreen('matching')
  }
  function handleReady() {
    requestFS()   // user tap → fullscreen ได้ทันที
    let name = 'คุณ'
    try {
      const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').split('.')[0]
      const raw = localStorage.getItem(`sb-${ref}-auth-token`)
      if (raw) {
        const s = JSON.parse(raw)
        const isReadable = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && /^[ -~฀-๿\s]+$/.test(v.trim())
        const candidates = [s?.user?.user_metadata?.name, s?.user?.user_metadata?.username, s?.user?.user_metadata?.full_name, s?.user?.email?.split('@')[0]]
        for (const c of candidates) { if (isReadable(c)) { name = (c as string).split(' ')[0].substring(0, 10); break } }
      }
    } catch {}
    const newState = initGame(name, characters)
    dispatch({ type: 'RESET', newState })
    setScreen('game')
    const handSize = newState.players[0].hand.length
    setDealing(true)
    Array.from({ length: handSize }).forEach((_, i) => setTimeout(() => playSound('deal'), 60 + i * 75))
    setTimeout(() => setDealing(false), 60 + handSize * 75 + 500)
  }
  function handleRestart() { setCharacters([]); setCardOrder([]); setLastDrawnCardId(null); prevHandRef.current = new Set(); prevLogLenRef.current = 0; setScreen('start') }

  useEffect(() => {
    if (!state || screen !== 'game') return
    const ids = state.players[0].hand.map(c => c.id)
    setCardOrder(prev => [...prev.filter(id => ids.includes(id)), ...ids.filter(id => !prev.includes(id))])
  }, [state?.players[0]?.hand.length, screen])

  const sortedHand = useMemo(() => {
    if (!state) return []
    const map = new Map(state.players[0].hand.map(c => [c.id, c]))
    return cardOrder.filter(id => map.has(id)).map(id => map.get(id)!)
  }, [state?.players[0]?.hand, cardOrder])

  const dragFrom = useRef<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const touchPick = useRef<number | null>(null)
  const [touchPickIdx, setTouchPickIdx] = useState<number | null>(null)

  function reorder(from: number, to: number) {
    setCardOrder(prev => { const a = [...prev]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a })
  }
  function tapSwap(idx: number) {
    if (touchPick.current === null) { touchPick.current = idx; setTouchPickIdx(idx) }
    else if (touchPick.current === idx) { touchPick.current = null; setTouchPickIdx(null) }
    else { reorder(touchPick.current, idx); touchPick.current = null; setTouchPickIdx(null) }
  }

  // ── AI engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game' || !state || state.phase === 'gameover') return
    const cur = state.players[state.currentPlayerIndex]
    if (!cur.isAI) return
    if (state.phase !== 'draw') return
    setAiThinking(true)
    const drawActions = computeAIActions(state)
    const capturedState = state
    const think1 = ['กำลังดูไพ่...', 'คิดอยู่นะ...', 'วางแผน...', 'ดูกองทิ้ง...'][Math.floor(Math.random() * 4)]
    const think2 = ['เลือกไพ่...', 'ตัดสินใจ...', 'จะทิ้งไพ่ไหนดี...', 'คิดหนักอยู่...'][Math.floor(Math.random() * 4)]
    setAiThinkMsg(think1)
    const drawDelay = 2000 + Math.random() * 1800
    let t2: ReturnType<typeof setTimeout>
    const t1 = setTimeout(() => {
      setAiThinkMsg(think2)
      const drawAction = drawActions[0]
      const afterDraw = drawAction ? gameReducer(capturedState, drawAction) : capturedState
      dispatch({ type: 'RESET', newState: afterDraw })
      const actionDelay = 1600 + Math.random() * 2400
      t2 = setTimeout(() => {
        const postActions = computePostDrawActions(afterDraw)
        let s = afterDraw
        for (const a of postActions) s = gameReducer(s, a)
        dispatch({ type: 'RESET', newState: s })
        setAiThinking(false); setAiThinkMsg('')
      }, actionDelay)
    }, drawDelay)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [state?.currentPlayerIndex, screen])

  // ── Screen routing ────────────────────────────────────────────────────
  if (screen === 'start') return <StartScreen onSearch={handleSearch} />
  if (screen === 'matching') return <MatchmakingScreen count={aiCount} characters={characters} onReady={handleReady} />
  if (!state || state.phase === 'gameover') return <GameOverScreen state={state} onRestart={handleRestart} />

  // ── Derived state ─────────────────────────────────────────────────────
  const human = state.players[0]
  const isHumanTurn = state.currentPlayerIndex === 0
  const isAction = isHumanTurn && state.phase === 'action'
  const topDiscard = state.discardPile[state.discardPile.length - 1]
  const opponents = state.players.slice(1)

  // NOTE: regular variables — no useMemo after conditional returns (Rules of Hooks)
  const canKnock = isHumanTurn && state.phase === 'action' && (
    human.hand.length === 1 || (!human.hasLaid && findKnockResult(human.hand) !== null)
  )
  const isDarkKnockReady = canKnock && !human.hasLaid && human.hand.length > 1
  const canDiscard = isHumanTurn && state.phase === 'action' && state.selectedCardIds.length === 1
  // เกิดได้ทุกตาที่อยู่ใน action phase และเลือกไพ่ครบ (ทั้งมืดและสว่าง)
  const canLayMeld = isAction && state.selectedCardIds.length >= 3
  const canFak = isHumanTurn && state.phase === 'action' && state.selectedCardIds.length > 0 && human.hasLaid

  // Turn state label (for action column status pill)
  const turnLabel = !isHumanTurn
    ? (aiThinking ? `${state.players[state.currentPlayerIndex].name.substring(0, 8)} ${aiThinkMsg}` : `รอตาคู่ต่อสู้…`)
    : state.phase === 'draw' ? 'ตาคุณ — จั่ว หรือ เก็บ'
    : 'ตาคุณ — เกิด/ฝาก แล้วทิ้ง'

  // Head card detection
  const headCard = state.headCardId ? state.players[0].hand.find(c => c.id === state.headCardId) ?? null : null

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', flexDirection: 'column',
      background: '#0a0907', overflow: 'hidden', userSelect: 'none',
      fontFamily: 'var(--th-body)',
    }}>

      {/* ══ Header bar — 32px ══════════════════════════════════════════ */}
      <div style={{
        height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 10px',
        background: 'linear-gradient(180deg, #2f1810 0%, #1d0e07 70%, #0e0703 100%)',
        borderBottom: '1px solid #3a2510',
        boxShadow: 'inset 0 -1px 0 rgba(212,168,74,.35), 0 1px 4px rgba(0,0,0,.6)',
        zIndex: 10,
      }}>
        <Link href="/lobby" style={{
          fontSize: 11, color: '#c8b88a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(212,168,74,.3)',
        }}>← ออก</Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <Crown size={12} />
          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--th-display)', color: '#e6c275', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
            ดัมมี่ Royal
          </span>
          <div style={{ width: 1, height: 12, background: '#d4a84a55' }} />
          <span style={{ fontSize: 10, color: '#c8b88a', whiteSpace: 'nowrap' }}>
            จดแต้ม · {state.players.length} คน
          </span>
          <div style={{ width: 1, height: 12, background: '#d4a84a55' }} />
          <span className="brass-pill" style={{ fontSize: 9, padding: '1px 7px', fontWeight: 700, color: '#1a1006', whiteSpace: 'nowrap' }}>
            รอบ {state.roundNumber}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {state.players.map((p, i) => {
            const sc = state.roundScores[i] ?? 0
            const active = i === state.currentPlayerIndex
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: 10, color: active ? '#F5D070' : 'rgba(255,255,255,.3)', fontWeight: active ? 800 : 400 }}>
                  {p.name.split(' ')[0].substring(0, 4)}:{p.hand.length}
                </span>
                {sc !== 0 && <span style={{ fontSize: 8, color: sc > 0 ? '#4ade80' : '#f87171', marginLeft: 1 }}>{sc > 0 ? '+' : ''}{sc}</span>}
              </div>
            )
          })}
          {/* Fullscreen toggle button */}
          <button onClick={toggleFS} style={{
            background: 'none', border: '1px solid rgba(212,168,74,.35)',
            borderRadius: 4, color: '#c8b88a', fontSize: 14, cursor: 'pointer',
            width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0,
            lineHeight: 1, flexShrink: 0,
          }} title={isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'}>
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        </div>
      </div>

      {/* ══ Middle — felt table area ════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {/* Wood background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, #2f1810 0%, #1a0e07 60%, #0e0703 100%)',
        }} />

        {/* Felt frame with wood border */}
        <div style={{
          position: 'absolute', inset: '4px 12px',
          background: 'linear-gradient(180deg, #5c3318, #3d1f12 30%, #1d0e07 100%)',
          borderRadius: 14,
          boxShadow: `
            inset 0 0 0 1px #d4a84a,
            inset 0 0 0 2px #1a1006,
            inset 0 0 0 3px #8a6418,
            inset 0 0 30px rgba(0,0,0,.6),
            0 4px 16px rgba(0,0,0,.8)
          `,
        }}>
          {/* Felt interior */}
          <div className="royal-felt" style={{ position: 'absolute', inset: 6, borderRadius: 8 }}>

            {/* Corner filigree */}
            <CornerFiligree size={40} style={{ position: 'absolute', top: 4, left: 4, zIndex: 1 }} />
            <CornerFiligree size={40} rotate={90} style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }} />
            <CornerFiligree size={40} rotate={180} style={{ position: 'absolute', bottom: 4, right: 4, zIndex: 1 }} />
            <CornerFiligree size={40} rotate={270} style={{ position: 'absolute', bottom: 4, left: 4, zIndex: 1 }} />

            {/* ── Opponent strip ──────────────────────────────────────── */}
            <div style={{
              position: 'absolute', top: 4, left: 8, right: 8,
              display: 'flex', justifyContent: opponents.length === 1 ? 'center' : 'space-around',
              alignItems: 'flex-start', zIndex: 4, gap: 4,
            }}>
              {opponents.map((opp, i) => {
                const seatIdx = i + 1
                const isActive = state.currentPlayerIndex === seatIdx
                const oppColor = OWNER_COLORS[seatIdx] ?? OWNER_COLORS[1]
                return (
                  <div key={opp.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                    borderRadius: 8, flexShrink: 0,
                    background: isActive ? 'radial-gradient(ellipse at center, rgba(243,215,122,.15) 0%, transparent 70%)' : 'transparent',
                  }}>
                    {/* Hidden hand */}
                    <HiddenHand count={opp.hand.length} compact={opponents.length === 3} />

                    {/* Avatar ring */}
                    <div style={{ position: 'relative' }}>
                      <div className={`avatar-ring-brass ${isActive ? 'pulse-gold' : ''}`}
                        style={{ width: 38, height: 38 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 30%, #f0d9a8 0%, ${oppColor}88 90%)`,
                          display: 'grid', placeItems: 'center', fontSize: 20,
                        }}>
                          {characters[i]?.avatar ?? '🧑'}
                        </div>
                      </div>
                      {/* Hand count badge */}
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        background: '#b81e35', color: '#fff', borderRadius: '50%',
                        width: 15, height: 15, display: 'grid', placeItems: 'center',
                        fontSize: 8, fontWeight: 800, border: '1.5px solid #1a1006',
                        boxShadow: '0 1px 2px rgba(0,0,0,.6)',
                      }}>{opp.hand.length}</div>
                    </div>

                    {/* Name + status */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--th-display)', color: '#e6c275', whiteSpace: 'nowrap', letterSpacing: '.01em' }}>
                        {opp.name.split(' ')[0].substring(0, 8)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <span style={{
                          fontSize: 8.5, fontFamily: 'var(--th-body)', fontWeight: 600,
                          color: opp.hasLaid ? '#f3d77a' : '#c8b88a',
                          background: opp.hasLaid ? 'rgba(243,215,122,.15)' : 'rgba(0,0,0,.3)',
                          padding: '0 5px', borderRadius: 999,
                          border: `1px solid ${opp.hasLaid ? '#d4a84a55' : '#55555533'}`,
                        }}>{isActive && aiThinking ? `💭 ${aiThinkMsg.substring(0, 6)}` : opp.hasLaid ? 'สว่าง' : 'มืด'}</span>
                        <span className="brass-pill" style={{ fontSize: 8, padding: '0 5px', fontWeight: 700, color: '#1a1006' }}>
                          {(state.roundScores[seatIdx] ?? 0) >= 0 ? '+' : ''}{state.roundScores[seatIdx] ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Meld rail (horizontal scroll) ──────────────────────── */}
            <div className="no-scrollbar" style={{
              position: 'absolute', top: 74, left: 8, right: 8, height: 58,
              display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'flex-start',
              padding: '4px 2px', zIndex: 3,
            }}>
              {state.tableMelds.length === 0 ? (
                <div style={{ alignSelf: 'center', width: '100%', textAlign: 'center', fontSize: 10, color: '#c8b88a', fontFamily: 'var(--th-body)', opacity: 0.7 }}>
                  ยังไม่มีใครเกิด — เลือกไพ่แล้วกด เกิด
                </div>
              ) : state.tableMelds.map(meld => {
                const ownerName = state.players[meld.ownerIndex]?.name ?? '?'
                const ownerColor = OWNER_COLORS[meld.ownerIndex] ?? OWNER_COLORS[0]
                return (
                  <RoyalMeldGroup
                    key={meld.id}
                    meld={meld}
                    ownerInitial={ownerName[0] ?? '?'}
                    ownerColor={ownerColor}
                    canFak={canFak}
                    onFak={() => { playSound('card'); dispatch({ type: 'ADD_TO_MELD', meldId: meld.id }) }}
                    flash={flashMeldId === meld.id}
                  />
                )
              })}
            </div>

            {/* ── Center piles ───────────────────────────────────────── */}
            <div style={{
              position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'flex-end', gap: 16, zIndex: 5,
            }}>
              {/* Draw pile */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ position: 'relative', width: 50, height: 70 }}
                  onClick={isHumanTurn && state.phase === 'draw' ? () => { playSound('deal'); dispatch({ type: 'DRAW_FROM_DECK' }) } : undefined}>
                  {/* Stack layers */}
                  {[3, 2, 1].map(off => (
                    <div key={off} style={{
                      position: 'absolute', left: off * 1.5, top: -off * 1.5,
                      width: 44, height: 62, borderRadius: 6,
                      background: `rgba(10,31,77,${0.5 + off * 0.1})`,
                      border: '1px solid rgba(30,80,150,.4)',
                    }} />
                  ))}
                  {/* Top card */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 30% 30%, #2a4f8a 0%, #0a1f4d 50%, #03102a 100%)',
                    borderRadius: 6, border: `2px solid ${isHumanTurn && state.phase === 'draw' ? '#f3d77a' : 'rgba(30,80,150,.5)'}`,
                    cursor: isHumanTurn && state.phase === 'draw' ? 'pointer' : 'default',
                    boxShadow: isHumanTurn && state.phase === 'draw'
                      ? '0 0 18px #f3d77a, 0 0 32px rgba(212,168,74,.5), 0 4px 12px rgba(0,0,0,.7)'
                      : '0 4px 12px rgba(0,0,0,.7)',
                    transform: isHumanTurn && state.phase === 'draw' ? 'scale(1.06) translateY(-2px)' : 'scale(1)',
                    transition: 'all .2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', inset: 4, borderRadius: 4, backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,168,74,.2) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(212,168,74,.15) 0 2px, transparent 2px 6px)' }} />
                    <div style={{ fontSize: 22, fontFamily: 'var(--en-display)', fontWeight: 900, color: '#f3d77a', textShadow: '0 1px 3px #000, 0 0 8px #d4a84a', position: 'relative', zIndex: 1 }}>
                      {state.deck.length}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 9, color: '#c8b88a', fontFamily: 'var(--th-body)' }}>กองจั่ว</span>
              </div>

              {/* Discard pile — fan spread, last 5 cards face-up */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {(() => {
                  const fanCards = state.discardPile.slice(-5)
                  const canTake = isHumanTurn && state.phase === 'draw' && !!topDiscard && canDiscardBePickedForMeld(topDiscard, human.hand)
                  const fanStep = 18
                  const totalW = Math.max(60, 60 + (fanCards.length - 1) * fanStep)
                  return (
                    <div style={{ position: 'relative', width: totalW, height: 86 }}>
                      {fanCards.length === 0 ? (
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          border: '2px dashed rgba(212,168,74,.4)',
                          display: 'grid', placeItems: 'center',
                          color: 'rgba(212,168,74,.5)', fontSize: 9,
                        }}>กองทิ้ง</div>
                      ) : fanCards.map((c, i) => {
                        const isTop = i === fanCards.length - 1
                        const leftPx = i * fanStep
                        return (
                          <div key={c.id} style={{
                            position: 'absolute', left: leftPx, top: 0,
                            zIndex: i + 1,
                            transition: 'transform .2s',
                            transform: isTop && canTake ? 'scale(1.07) translateY(-4px)' : 'none',
                          }}>
                            <CardComponent
                              card={c}
                              glow={isTop && canTake}
                              head={c.id === state.headCardId}
                            />
                          </div>
                        )
                      })}
                      {/* Full-area click overlay when canTake — คลิกที่ไหนก็ได้ในกองทิ้ง */}
                      {canTake && (
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 99,
                          cursor: 'pointer',
                          borderRadius: 6,
                          outline: '2px solid #f3d77a',
                          outlineOffset: 3,
                          boxShadow: '0 0 16px rgba(243,215,122,.5)',
                        }}
                          onClick={() => { playSound('card'); dispatch({ type: 'TAKE_DISCARD' }) }}
                        />
                      )}
                    </div>
                  )
                })()}
                <span style={{ fontSize: 9, color: '#c8b88a', fontFamily: 'var(--th-body)' }}>
                  กองทิ้ง ({state.discardPile.length})
                </span>
              </div>
            </div>

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toast && (
              <div className="royal-fade-up" style={{
                position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'linear-gradient(180deg,#1a1006ee,#0e0703ee)',
                color: '#f3d77a', border: '1px solid rgba(212,168,74,.7)',
                padding: '6px 16px', borderRadius: 6, fontSize: 12, zIndex: 20,
                fontFamily: 'var(--th-display)', fontWeight: 700, whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,.7), inset 0 1px 0 rgba(243,215,122,.3)',
                pointerEvents: 'none',
              }}>{toast}</div>
            )}

          </div>{/* end felt interior */}
        </div>{/* end felt frame */}
      </div>{/* end middle */}

      {/* ══ Hand strip — 120px ═════════════════════════════════════════ */}
      <div style={{
        height: 120, flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(20,12,6,0) 0%, rgba(20,12,6,.6) 8%, #1d0e07 30%, #0e0703 100%)',
        borderTop: '1px solid #3a2510',
        boxShadow: 'inset 0 1px 0 rgba(212,168,74,.3)',
        display: 'flex', alignItems: 'center', padding: '0 8px',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}>

        {/* ── You — avatar column (70px) ── */}
        <div style={{ width: 70, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div className={`avatar-ring-brass ${isHumanTurn ? 'pulse-gold' : ''}`} style={{ width: 42, height: 42 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #f0d9a8 0%, #1a3a8a88 90%)',
                display: 'grid', placeItems: 'center', fontSize: 22,
              }}>🧑</div>
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              background: human.hasLaid ? 'linear-gradient(135deg,#14532d,#16a34a)' : 'linear-gradient(135deg,#374151,#4b5563)',
              color: '#fff', borderRadius: '50%', width: 15, height: 15,
              display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 800, border: '1.5px solid #1a1006',
            }}>{human.hand.length}</div>
          </div>

          {/* Name + status pill */}
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--th-display)', color: '#e6c275', lineHeight: 1 }}>คุณ</div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              fontSize: 8, color: human.hasLaid ? '#f3d77a' : '#c8b88a',
              background: human.hasLaid ? 'rgba(243,215,122,.15)' : 'rgba(0,0,0,.3)',
              padding: '0 5px', borderRadius: 999, border: `1px solid ${human.hasLaid ? '#d4a84a55' : '#55555533'}`,
            }}>{human.hasLaid ? 'สว่าง' : 'มืด'}</span>
            {(state.roundScores[0] ?? 0) !== 0 && (
              <span className="brass-pill" style={{ fontSize: 8, padding: '0 5px', fontWeight: 700, color: '#1a1006' }}>
                {(state.roundScores[0] ?? 0) > 0 ? '+' : ''}{state.roundScores[0]}
              </span>
            )}
          </div>
        </div>

        {/* ── Hand cards (fan layout) ── */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'flex-end',
          padding: '0 8px 8px',
          overflowX: 'auto', overflowY: 'visible',
          position: 'relative',
        }}>
          {/* inner fan row — allows overflowY visible for lifted cards */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            paddingTop: 22, paddingBottom: 0,
            position: 'relative',
          }}>
            {sortedHand.map((card, index) => {
              const isSelected = state.selectedCardIds.includes(card.id)
              const isTouchPicked = touchPickIdx === index
              const isDropTarget = dropAt === index && dragFrom.current !== null && dragFrom.current !== index
              const isHead = card.id === state.headCardId
              const isLastDrawn = card.id === lastDrawnCardId
              // Fan overlap: show ~26px of each card, last card fully visible
              const fanShift = index === 0 ? 0 : -34
              const liftY = isSelected ? -16 : 0
              return (
                <div key={card.id}
                  style={{
                    flexShrink: 0, cursor: isAction ? 'pointer' : 'default',
                    marginLeft: isDropTarget ? 10 : fanShift,
                    transition: 'margin .1s, transform .14s',
                    transform: `translateY(${liftY}px)`,
                    outline: isTouchPicked ? '2px solid #d4a84a' : 'none', outlineOffset: 2, borderRadius: 7,
                    position: 'relative',
                    zIndex: isSelected ? 50 + index : index,
                    animation: dealing ? `dealCard .38s ${index * .065}s both` : 'none',
                  }}
                  draggable
                  onDragStart={() => { dragFrom.current = index }}
                  onDragOver={e => { e.preventDefault(); setDropAt(index) }}
                  onDragLeave={() => setDropAt(null)}
                  onDrop={() => { if (dragFrom.current !== null && dragFrom.current !== index) reorder(dragFrom.current, index); setDropAt(null); dragFrom.current = null }}
                  onDragEnd={() => { setDropAt(null); dragFrom.current = null }}
                  onDoubleClick={() => tapSwap(index)}
                  onClick={() => { if (isAction) { playSound('select'); dispatch({ type: 'TOGGLE_CARD', cardId: card.id }) } }}
                >
                  {isHead && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: '#fbbf24', zIndex: 10, whiteSpace: 'nowrap' }}>👑</div>}
                  <CardComponent card={card} selected={isSelected} glow={isLastDrawn} head={isHead} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Action buttons column ── */}
        <div style={{
          width: 176, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 5,
          alignItems: 'stretch', paddingLeft: 8, paddingRight: 4,
        }}>

          {/* Status label */}
          <div style={{
            fontSize: 11, fontFamily: '"Sarabun", sans-serif', fontWeight: 700,
            padding: '4px 8px', borderRadius: 5, textAlign: 'center',
            border: `1px solid ${isHumanTurn ? '#5a3f08' : '#2a2a2a'}`,
            background: isHumanTurn
              ? 'linear-gradient(180deg,#f3d77a,#d4a84a 50%,#8a6418)'
              : 'rgba(255,255,255,.06)',
            color: isHumanTurn ? '#1a1006' : '#9a8a6a',
            boxShadow: isHumanTurn ? 'inset 0 1px 0 rgba(255,255,255,.5), 0 1px 4px rgba(0,0,0,.4)' : 'none',
            lineHeight: 1.3, minHeight: 24,
            animation: !isHumanTurn && aiThinking ? 'pulse .9s infinite' : 'none',
          }}>{turnLabel}</div>

          {/* Row 1: เกิด + ฝาก */}
          <div style={{ display: 'flex', gap: 5 }}>
            <ActionBtn
              label="เกิด" flex={1}
              enabled={canLayMeld}
              activeStyle={{ background: 'linear-gradient(180deg,#4ade80,#16a34a 50%,#14532d)', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,74,.5)' }}
              onClick={() => { if (canLayMeld) { playSound('card'); dispatch({ type: 'LAY_MELD' }) } }}
            />
            <ActionBtn
              label="ฝาก" flex={1}
              enabled={canFak && state.tableMelds.length > 0}
              onClick={() => {
                if (!canFak) return
                const target = state.tableMelds[0]
                if (target) { playSound('card'); dispatch({ type: 'ADD_TO_MELD', meldId: target.id }) }
              }}
            />
          </div>

          {/* Row 2: ทิ้ง + น็อก */}
          <div style={{ display: 'flex', gap: 5 }}>
            <ActionBtn
              label="ทิ้ง" flex={1}
              enabled={canDiscard}
              activeStyle={{ background: 'linear-gradient(180deg,#f87171,#dc2626 50%,#7f1d1d)', color: '#fff', boxShadow: '0 2px 8px rgba(220,38,38,.5)' }}
              onClick={() => { if (canDiscard) { playSound('discard'); dispatch({ type: 'DISCARD' }) } }}
            />
            <ActionBtn
              label={isDarkKnockReady ? 'มืดน็อก' : 'น็อก!'}
              flex={1}
              enabled={canKnock}
              pulse={canKnock}
              activeStyle={isDarkKnockReady
                ? { background: 'linear-gradient(180deg,#a855f7,#7c3aed 50%,#3b0764)', color: '#f5d0fe', boxShadow: '0 0 14px rgba(124,58,237,.7)' }
                : { background: 'linear-gradient(180deg,#f3d77a,#d4a84a 50%,#8a6418)', color: '#1a1006', boxShadow: '0 0 14px rgba(212,168,74,.7)' }}
              onClick={() => { if (canKnock) { playSound('knock'); dispatch({ type: 'KNOCK' }) } }}
            />
          </div>

          {/* Cancel selection */}
          {state.selectedCardIds.length > 0 && (
            <button onClick={() => dispatch({ type: 'CLEAR_SELECTION' })} style={{
              padding: '4px 0', borderRadius: 5, fontSize: 11,
              fontFamily: '"Sarabun", sans-serif', fontWeight: 600,
              background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)',
              border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', letterSpacing: '.01em',
            }}>↺ ยกเลิกเลือก ({state.selectedCardIds.length})</button>
          )}
        </div>

      </div>{/* end hand strip */}

      {/* ══ Portrait overlay ═══════════════════════════════════════════ */}
      <div className="rotate-prompt" style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg,#0a0907,#1a0e07)',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, textAlign: 'center', padding: 24,
      }}>
        <div style={{ fontSize: 60, animation: 'rotateTilt 1.6s ease-in-out infinite alternate' }}>📱</div>
        <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 800, fontFamily: 'var(--th-display)' }}>หมุนหน้าจอ</div>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, lineHeight: 1.8 }}>
          เกมนี้เล่นในแนวนอนเท่านั้น<br />กรุณาหมุนโทรศัพท์ของคุณ
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes ping{75%,100%{transform:scale(1.4);opacity:0}}
        @keyframes rotateTilt{from{transform:rotate(0deg)}to{transform:rotate(-90deg)}}
        @keyframes dealCard{
          0%{transform:translateY(-80px) scale(.4) rotate(-8deg);opacity:0}
          60%{transform:translateY(4px) scale(1.04) rotate(1deg);opacity:1}
          100%{transform:translateY(0) scale(1) rotate(0deg);opacity:1}
        }
        div::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  )
}
