import { Card, Meld } from '@/types/game'
import { RANK_ORDER } from './deck'

// ─── ยูทิลิตี้ ────────────────────────────────────────────────────────────────

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ]
}

function isConsecutive(vals: number[]): boolean {
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] - vals[i - 1] !== 1) return false
  }
  return true
}

// ─── ตรวจตอง: rank เดียวกัน ≥3 ใบ คนละดอก ───────────────────────────────────
function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false
  const ranks = new Set(cards.map(c => c.rank))
  if (ranks.size > 1) return false
  const suits = cards.map(c => c.suit)
  return new Set(suits).size === suits.length
}

// ─── ตรวจเรียง: ดอกเดียวกัน เรียงต่อเนื่อง ≥3 ใบ ────────────────────────────
// A สามารถเป็น A-2-3 (ต่ำ) หรือ Q-K-A (สูง) ห้าม K-A-2
function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false
  const suits = new Set(cards.map(c => c.suit))
  if (suits.size > 1) return false

  const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].rank === sorted[i - 1].rank) return false
  }

  // A ต่ำ
  if (isConsecutive(sorted.map(c => RANK_ORDER[c.rank]))) return true
  // A สูง (A=14)
  const hiVals = sorted.map(c => c.rank === 'A' ? 14 : RANK_ORDER[c.rank]).sort((a, b) => a - b)
  if (isConsecutive(hiVals)) return true

  return false
}

// ─── หา melds ทั้งหมดที่มีไพ่ใบนี้ (จาก allCards) ───────────────────────────
function getPossibleMeldsContaining(card: Card, allCards: Card[]): Card[][] {
  const result: Card[][] = []

  // ── Sets ──
  const others = allCards.filter(c => c.id !== card.id && c.rank === card.rank)
  const uniqueOthers: Card[] = []
  const usedSuits = new Set<string>([card.suit])
  for (const c of others) {
    if (!usedSuits.has(c.suit)) { uniqueOthers.push(c); usedSuits.add(c.suit) }
  }
  for (const size of [2, 3]) {
    for (const combo of combinations(uniqueOthers, size)) {
      result.push([card, ...combo])
    }
  }

  // ── Runs (A ต่ำ) ──
  const sameSuitLow = allCards
    .filter(c => c.suit === card.suit)
    .sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])
  const cIdxLow = sameSuitLow.findIndex(c => c.id === card.id)
  if (cIdxLow !== -1) {
    for (let start = 0; start <= cIdxLow; start++) {
      for (let end = Math.max(cIdxLow, start + 2); end < sameSuitLow.length; end++) {
        const run = sameSuitLow.slice(start, end + 1)
        if (isConsecutive(run.map(c => RANK_ORDER[c.rank]))) {
          result.push(run)
        }
      }
    }
  }

  // ── Runs (A สูง) ──
  const hiVal = (r: string) => r === 'A' ? 14 : RANK_ORDER[r]
  const sameSuitHigh = allCards
    .filter(c => c.suit === card.suit)
    .sort((a, b) => hiVal(a.rank) - hiVal(b.rank))
  const cIdxHigh = sameSuitHigh.findIndex(c => c.id === card.id)
  if (cIdxHigh !== -1) {
    for (let start = 0; start <= cIdxHigh; start++) {
      for (let end = Math.max(cIdxHigh, start + 2); end < sameSuitHigh.length; end++) {
        const run = sameSuitHigh.slice(start, end + 1)
        if (isConsecutive(run.map(c => hiVal(c.rank)))) {
          // ไม่ซ้ำกับที่มีแล้ว
          const runIds = new Set(run.map(c => c.id))
          if (!result.some(r => r.length === run.length && r.every(c => runIds.has(c.id)))) {
            result.push(run)
          }
        }
      }
    }
  }

  return result
}

// ─── ตรวจว่าไพ่ทั้งหมดจัดเป็นชุดได้หมด (ไม่เหลือลอย) ──────────────────────
export function canFormAllMelds(cards: Card[]): boolean {
  if (cards.length === 0) return true
  if (cards.length < 3) return false

  // sort deterministically
  const sorted = [...cards].sort((a, b) =>
    a.suit !== b.suit ? a.suit.localeCompare(b.suit) : RANK_ORDER[a.rank] - RANK_ORDER[b.rank]
  )

  const first = sorted[0]
  const possibleMelds = getPossibleMeldsContaining(first, sorted)

  for (const meld of possibleMelds) {
    const meldIds = new Set(meld.map(c => c.id))
    const rest = sorted.filter(c => !meldIds.has(c.id))
    if (canFormAllMelds(rest)) return true
  }

  return false
}

// ─── แตก cards เป็น melds array (ใช้ตอน dark knock reveal) ─────────────────
function extractMelds(cards: Card[]): Card[][] | null {
  if (cards.length === 0) return []
  if (cards.length < 3) return null

  const sorted = [...cards].sort((a, b) =>
    a.suit !== b.suit ? a.suit.localeCompare(b.suit) : RANK_ORDER[a.rank] - RANK_ORDER[b.rank]
  )

  const first = sorted[0]
  const possibleMelds = getPossibleMeldsContaining(first, sorted)

  for (const meld of possibleMelds) {
    const meldIds = new Set(meld.map(c => c.id))
    const rest = sorted.filter(c => !meldIds.has(c.id))
    const restResult = extractMelds(rest)
    if (restResult !== null) return [meld, ...restResult]
  }

  return null
}

// ─── หาไพ่ที่จะน็อค + melds ที่เกิด (สำหรับ dark knock) ─────────────────────
// คืน null ถ้าน็อคไม่ได้
export function findKnockResult(hand: Card[]): { knockCard: Card; melds: Card[][] } | null {
  for (const card of hand) {
    const rest = hand.filter(c => c.id !== card.id)
    const melds = extractMelds(rest)
    if (melds !== null) return { knockCard: card, melds }
  }
  return null
}

// ─── ตรวจทิ้งมี่: ทิ้งแล้วผู้เล่นถัดไปหยิบเกิดได้ทันที ─────────────────────
export function canDiscardBePickedForMeld(discarded: Card, opponentHand: Card[]): boolean {
  const withDiscard = [...opponentHand, discarded]
  return getPossibleMeldsContaining(discarded, withDiscard).length > 0
}

// ─── Public validators ────────────────────────────────────────────────────────

export function isValidMeld(cards: Card[]): { valid: boolean; type: 'set' | 'run' | null } {
  if (isValidSet(cards)) return { valid: true, type: 'set' }
  if (isValidRun(cards)) return { valid: true, type: 'run' }
  return { valid: false, type: null }
}

export function canAddToMeld(meld: Meld, newCards: Card[]): boolean {
  const combined = [...meld.cards, ...newCards]
  if (meld.type === 'set') {
    if (combined.length > 4) return false
    return isValidSet(combined)
  }
  return isValidRun(combined)
}
