'use client'
import { Card } from '@/types/game'

interface CardProps {
  card: Card
  selected?: boolean
  faceDown?: boolean
  small?: boolean     // mini card 22×32 (ใน meld rail)
  onClick?: () => void
  disabled?: boolean
  glow?: boolean      // ไพ่ที่เพิ่งจั่ว
  head?: boolean      // ไพ่หัว (+50)
}

// Suit mapping: game type → short key
const SUIT_KEY: Record<string, string> = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' }
const SUIT_GLYPH: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
const IS_RED: Record<string, boolean>   = { S: false, H: true, D: true, C: false }

// Speeto = 2♣ or Q♠ (50 pts each)
function isSpeto(suitKey: string, rank: string) {
  return (rank === '2' && suitKey === 'C') || (rank === 'Q' && suitKey === 'S')
}

// Pip positions [col, row] — col: 1=left 2=center 3=right, row: 1-5 (row > 3 rotates 180°)
const PIP_LAYOUTS: Record<string, [number, number][]> = {
  '2':  [[2,1],[2,5]],
  '3':  [[2,1],[2,3],[2,5]],
  '4':  [[1,1],[3,1],[1,5],[3,5]],
  '5':  [[1,1],[3,1],[2,3],[1,5],[3,5]],
  '6':  [[1,1],[3,1],[1,3],[3,3],[1,5],[3,5]],
  '7':  [[1,1],[3,1],[2,2],[1,3],[3,3],[1,5],[3,5]],
  '8':  [[1,1],[3,1],[2,2],[1,3],[3,3],[2,4],[1,5],[3,5]],
  '9':  [[1,1],[3,1],[1,2.5],[3,2.5],[2,3],[1,3.5],[3,3.5],[1,5],[3,5]],
  '10': [[1,1],[3,1],[2,1.6],[1,2.5],[3,2.5],[1,3.5],[3,3.5],[2,4.4],[1,5],[3,5]],
}

// ─── Face art (J/Q/K) SVG silhouette ──────────────────────────────────
function FaceArt({ rank, suit, w, h, red }: { rank: string; suit: string; w: number; h: number; red: boolean }) {
  const fill   = red ? '#b81e35' : '#1a1410'
  const accent = red ? '#7a0f1f' : '#3a2d1a'
  const robe   = red ? '#7a0f1f' : '#2a1f10'
  const glyph  = SUIT_GLYPH[suit] || ''
  const gradId = `fg-${rank}-${suit}`

  if (rank === 'K') return (
    <svg viewBox="0 0 60 80" width={w} height={h} preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f3d77a" /><stop offset="1" stopColor="#8a6418" />
      </linearGradient></defs>
      <rect x="6" y="14" width="48" height="60" rx="2" fill="#f6efdc" stroke={accent} strokeWidth=".7" />
      <path d="M18 18 L22 12 L26 18 L30 10 L34 18 L38 12 L42 18 L42 22 L18 22 Z" fill={`url(#${gradId})`} stroke={accent} strokeWidth=".6" />
      <circle cx="22" cy="13" r="1.2" fill="#b81e35" /><circle cx="30" cy="11" r="1.4" fill="#b81e35" /><circle cx="38" cy="13" r="1.2" fill="#b81e35" />
      <ellipse cx="30" cy="32" rx="7" ry="8.5" fill="#f0d9a8" stroke={accent} strokeWidth=".5" />
      <path d="M22 33 Q30 50 38 33 Q38 42 30 46 Q22 42 22 33 Z" fill={accent} />
      <circle cx="27" cy="31" r=".7" fill={accent} /><circle cx="33" cy="31" r=".7" fill={accent} />
      <path d="M14 50 L46 50 L50 76 L10 76 Z" fill={robe} stroke={accent} strokeWidth=".5" />
      <path d="M28 50 L32 50 L32 76 L28 76 Z" fill={`url(#${gradId})`} opacity=".9" />
      <text x="30" y="68" fontSize="9" fill={fill} textAnchor="middle" fontFamily="serif" fontWeight="700">{glyph}</text>
    </svg>
  )

  if (rank === 'Q') return (
    <svg viewBox="0 0 60 80" width={w} height={h}>
      <defs><linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f3d77a" /><stop offset="1" stopColor="#8a6418" />
      </linearGradient></defs>
      <rect x="6" y="14" width="48" height="60" rx="2" fill="#f6efdc" stroke={accent} strokeWidth=".7" />
      <path d="M20 20 L24 14 L30 18 L36 14 L40 20 L40 24 L20 24 Z" fill={`url(#${gradId})`} stroke={accent} strokeWidth=".5" />
      <circle cx="30" cy="16" r="1.6" fill="#b81e35" />
      <ellipse cx="30" cy="34" rx="7" ry="8" fill="#f0d9a8" stroke={accent} strokeWidth=".5" />
      <path d="M22 30 Q22 22 30 22 Q38 22 38 30 L38 36 Q38 30 30 30 Q22 30 22 36 Z" fill={accent} />
      <circle cx="27" cy="33" r=".7" fill={accent} /><circle cx="33" cy="33" r=".7" fill={accent} />
      <path d="M28 37 Q30 39 32 37" stroke={fill} strokeWidth=".7" fill="none" />
      <path d="M16 50 L44 50 L48 76 L12 76 Z" fill={robe} stroke={accent} strokeWidth=".5" />
      <ellipse cx="30" cy="62" rx="8" ry="3" fill={`url(#${gradId})`} opacity=".85" />
      <text x="30" y="73" fontSize="9" fill={fill} textAnchor="middle" fontFamily="serif" fontWeight="700">{glyph}</text>
    </svg>
  )

  // J
  return (
    <svg viewBox="0 0 60 80" width={w} height={h}>
      <defs><linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f3d77a" /><stop offset="1" stopColor="#8a6418" />
      </linearGradient></defs>
      <rect x="6" y="14" width="48" height="60" rx="2" fill="#f6efdc" stroke={accent} strokeWidth=".7" />
      <path d="M18 22 Q22 12 30 14 Q38 12 42 22 L42 26 L18 26 Z" fill={`url(#${gradId})`} stroke={accent} strokeWidth=".5" />
      <circle cx="42" cy="22" r="1.6" fill={fill} />
      <ellipse cx="30" cy="36" rx="6.5" ry="8" fill="#f0d9a8" stroke={accent} strokeWidth=".5" />
      <circle cx="27" cy="35" r=".7" fill={accent} /><circle cx="33" cy="35" r=".7" fill={accent} />
      <path d="M27 41 Q30 43 33 41" stroke={fill} strokeWidth=".6" fill="none" />
      <path d="M18 52 L42 52 L46 76 L14 76 Z" fill={robe} stroke={accent} strokeWidth=".5" />
      <path d="M30 52 L30 76" stroke={`url(#${gradId})`} strokeWidth="1.2" />
      <text x="30" y="71" fontSize="8" fill={fill} textAnchor="middle" fontFamily="serif" fontWeight="700">{glyph}</text>
    </svg>
  )
}

// ─── Card center: pip cluster, face art, or ace ────────────────────────
function CardCenter({ rank, suit, w, h, red }: { rank: string; suit: string; w: number; h: number; red: boolean }) {
  const glyph = SUIT_GLYPH[suit] || ''
  const color = red ? '#b81e35' : '#1a1410'

  if (['J', 'Q', 'K'].includes(rank)) return <FaceArt rank={rank} suit={suit} w={w} h={h} red={red} />

  if (rank === 'A') return (
    <div style={{
      width: w, height: h, display: 'grid', placeItems: 'center',
      fontFamily: 'serif', fontSize: Math.min(w, h) * 0.72, color, lineHeight: 1,
      filter: red ? 'drop-shadow(0 1px 0 #7a0f1f55)' : 'drop-shadow(0 1px 0 rgba(0,0,0,.3))',
    }}>{glyph}</div>
  )

  const pips = PIP_LAYOUTS[rank] || []
  const pipSize = Math.min(w * 0.32, h * 0.18)
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {pips.map(([col, row], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(col / 4) * 100}%`, top: `${(row / 6) * 100}%`,
          transform: `translate(-50%,-50%) ${row > 3 ? 'rotate(180deg)' : ''}`,
          fontFamily: 'serif', fontSize: pipSize, lineHeight: 1, color,
        }}>{glyph}</div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Main Card component
// ═══════════════════════════════════════════════════════════
export default function CardComponent({ card, selected, faceDown, small, onClick, disabled, glow, head }: CardProps) {
  const W = small ? 22 : 60
  const H = small ? 32 : 86
  const R = small ? 3 : 6

  // ── Card back ──────────────────────────────────────────
  if (faceDown || card.isJoker) {
    return (
      <div style={{
        width: W, height: H, borderRadius: R, flexShrink: 0, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 30% 30%, #2a4f8a 0%, #0a1f4d 50%, #03102a 100%)',
        border: '1px solid #5a4318',
        boxShadow: small
          ? '0 1px 3px rgba(0,0,0,.5)'
          : 'inset 0 0 0 2px #d4a84a55, inset 0 0 0 3px #03102a, inset 0 0 0 4px #d4a84a88, 0 2px 4px rgba(0,0,0,.4), 0 6px 12px rgba(0,0,0,.35)',
      }}>
        <div style={{
          position: 'absolute', inset: small ? 2 : 5, borderRadius: R - 2,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,168,74,.22) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(212,168,74,.18) 0 2px, transparent 2px 6px)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(212,168,74,.18) 0%, transparent 60%)' }} />
      </div>
    )
  }

  // ── Card face ──────────────────────────────────────────
  const suitKey  = SUIT_KEY[card.suit as string] || 'S'
  const rank     = card.rank as string
  const red      = IS_RED[suitKey]
  const color    = red ? '#b81e35' : '#1a1410'
  const glyph    = SUIT_GLYPH[suitKey] || ''
  const speto    = isSpeto(suitKey, rank)
  const rankSize = small ? Math.max(8, Math.round(W * 0.40)) : Math.max(10, Math.round(W * 0.21))
  const suitSize = small ? Math.max(6, Math.round(W * 0.28)) : Math.max(7, Math.round(W * 0.14))

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        position: 'relative', width: W, height: H, borderRadius: R, flexShrink: 0,
        background: 'linear-gradient(180deg, #fefaf0 0%, #f6efdc 70%, #e8debe 100%)',
        border: `1px solid ${selected ? '#d4a84a' : '#b8a878'}`,
        boxShadow: selected
          ? 'inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 2px #d4a84a, 0 0 16px rgba(212,168,74,.55), 0 6px 16px rgba(0,0,0,.5)'
          : glow
            ? 'inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 2px #f3d77a, 0 4px 12px rgba(0,0,0,.4)'
            : 'inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.4), 0 6px 12px rgba(0,0,0,.35)',
        transform: 'none',
        transition: 'transform .14s ease, box-shadow .14s ease',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        userSelect: 'none', opacity: disabled ? 0.45 : 1, color,
        fontFamily: '"Cinzel", serif',
      }}
    >
      {/* Top-left corner */}
      <div style={{ position: 'absolute', top: small ? 1 : 4, left: small ? 2 : 5, lineHeight: 1, color }}>
        <div style={{ fontSize: rankSize, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: suitSize, lineHeight: 1, marginTop: small ? 0 : 1 }}>{glyph}</div>
      </div>

      {/* Center art — full size only */}
      {!small && (
        <div style={{ position: 'absolute', inset: `${H * 0.18}px ${W * 0.18}px` }}>
          <CardCenter rank={rank} suit={suitKey} w={W * 0.64} h={H * 0.64} red={red} />
        </div>
      )}

      {/* Bottom-right corner rotated — full size only */}
      {!small && (
        <div style={{ position: 'absolute', bottom: 4, right: 5, transform: 'rotate(180deg)', lineHeight: 1, color }}>
          <div style={{ fontSize: rankSize, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>{rank}</div>
          <div style={{ fontSize: suitSize, lineHeight: 1, marginTop: 1 }}>{glyph}</div>
        </div>
      )}

      {/* Speeto crown — full size only */}
      {speto && !small && (
        <div style={{
          position: 'absolute', top: -7, right: -4,
          width: 18, height: 13, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(180deg,#f3d77a,#d4a84a 60%,#8a6418)',
          border: '1px solid #4a3608', borderRadius: 3,
          boxShadow: '0 1px 2px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.5)',
          transform: 'rotate(8deg)', zIndex: 2,
        }}>
          <svg width={10} height={10} viewBox="0 0 16 16">
            <path d="M1 5 L4 9 L8 4 L12 9 L15 5 L14 12 L2 12 Z" fill="#f3d77a" stroke="#5a3f08" strokeWidth=".5" />
          </svg>
        </div>
      )}

      {/* Head tag */}
      {head && (
        <div style={{
          position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg,#f3d77a,#d4a84a 50%,#8a6418)',
          color: '#1a1006', fontFamily: '"Charm", serif', fontWeight: 700, fontSize: 7.5,
          padding: '1px 5px', borderRadius: 999, border: '1px solid #4a3608',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 1px 2px rgba(0,0,0,.6)',
          whiteSpace: 'nowrap', lineHeight: 1.2, zIndex: 2,
        }}>หัว · 50</div>
      )}
    </div>
  )
}
