import { Card, Meld } from '@/types/game'
import { RANK_ORDER } from './deck'

function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false
  const nonJokers = cards.filter(c => !c.isJoker)
  if (nonJokers.length === 0) return false
  const ranks = new Set(nonJokers.map(c => c.rank))
  if (ranks.size > 1) return false
  // all suits must be different
  const suits = nonJokers.map(c => c.suit)
  return new Set(suits).size === suits.length
}

function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false
  const nonJokers = cards.filter(c => !c.isJoker)
  if (nonJokers.length === 0) return false
  const suits = new Set(nonJokers.map(c => c.suit))
  if (suits.size > 1) return false
  const jokerCount = cards.length - nonJokers.length
  const sorted = [...nonJokers].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])
  return canFormRun(sorted, jokerCount, false) || canFormRun(sorted, jokerCount, true)
}

function canFormRun(sorted: Card[], jokerCount: number, aceHigh: boolean): boolean {
  if (sorted.length === 0) return jokerCount >= 3
  const vals = sorted
    .map(c => (c.rank === 'A' ? (aceHigh ? 14 : 1) : RANK_ORDER[c.rank]))
    .sort((a, b) => a - b)
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] === vals[i - 1]) return false // duplicate rank
  }
  const span = vals[vals.length - 1] - vals[0] + 1
  const gaps = span - vals.length
  return gaps <= jokerCount && span <= 13
}

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
