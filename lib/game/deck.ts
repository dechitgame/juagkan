import { Card, Suit, Rank } from '@/types/game'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const RANK_ORDER: Record<string, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
}

// แต้มไพ่ตามกติการัมมี่ไทย
const BASE_SCORE: Record<string, number> = {
  '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5, '9': 5,
  '10': 10, J: 10, Q: 10, K: 10, A: 15,
}

/** คำนวณแต้มไพ่ 1 ใบ (รวมไพ่หัวและสปาโต) */
export function cardScore(card: Card, headCardId: string | null): number {
  if (card.id === headCardId) return 50
  if (isSpato(card)) return 50
  return BASE_SCORE[card.rank] ?? 5
}

/** ไพ่สปาโต: 2♣ หรือ Q♠ */
export function isSpato(card: Card): boolean {
  return card.id === 'clubs_2' || card.id === 'spades_Q'
}

export function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}_${rank}`, suit, rank, isJoker: false })
    }
  }
  return cards  // 52 ใบ ไม่มีโจ๊กเกอร์
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function cardName(card: Card): string {
  const sym: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
  return `${card.rank}${sym[card.suit] ?? ''}`
}
