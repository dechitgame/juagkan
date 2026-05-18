import { Card, Suit, Rank } from '@/types/game'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const RANK_ORDER: Record<string, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
}

export const CARD_VALUE: Record<string, number> = {
  A: 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10, JOKER: 20,
}

export function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}_${rank}`, suit, rank, isJoker: false })
    }
  }
  cards.push({ id: 'joker_1', suit: 'joker', rank: 'JOKER', isJoker: true })
  cards.push({ id: 'joker_2', suit: 'joker', rank: 'JOKER', isJoker: true })
  return cards
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function cardValue(card: Card): number {
  return CARD_VALUE[card.rank] ?? 0
}

export function cardName(card: Card): string {
  if (card.isJoker) return '🃏'
  const sym: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
  return `${card.rank}${sym[card.suit as string] ?? ''}`
}
