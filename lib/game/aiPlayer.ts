import { GameState, GameAction, Card, Meld } from '@/types/game'
import { RANK_ORDER, cardValue } from './deck'
import { isValidMeld, canAddToMeld } from './meldValidator'

interface MeldCandidate {
  cards: Card[]
  type: 'set' | 'run'
}

export function findBestMelds(hand: Card[]): MeldCandidate[] {
  const results: MeldCandidate[] = []
  const nonJokers = hand.filter(c => !c.isJoker)
  const jokers = hand.filter(c => c.isJoker)

  // Find sets: group by rank
  const byRank: Record<string, Card[]> = {}
  for (const c of nonJokers) {
    if (!byRank[c.rank]) byRank[c.rank] = []
    byRank[c.rank].push(c)
  }
  for (const cards of Object.values(byRank)) {
    if (cards.length >= 3) {
      results.push({ cards: cards.slice(0, 4), type: 'set' })
    } else if (cards.length === 2 && jokers.length > 0) {
      results.push({ cards: [...cards, jokers[0]], type: 'set' })
    }
  }

  // Find runs: group by suit, look for consecutive
  const bySuit: Record<string, Card[]> = {}
  for (const c of nonJokers) {
    if (!bySuit[c.suit]) bySuit[c.suit] = []
    bySuit[c.suit].push(c)
  }
  for (const cards of Object.values(bySuit)) {
    const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])
    for (let i = 0; i < sorted.length; i++) {
      let run = [sorted[i]]
      let jokersLeft = jokers.length
      for (let j = i + 1; j < sorted.length; j++) {
        const gap = RANK_ORDER[sorted[j].rank] - RANK_ORDER[run[run.length - 1].rank]
        if (gap === 1) {
          run.push(sorted[j])
        } else if (gap === 2 && jokersLeft > 0) {
          run.push(jokers[jokers.length - jokersLeft])
          jokersLeft--
          run.push(sorted[j])
        } else {
          break
        }
      }
      if (run.length >= 3) {
        results.push({ cards: run, type: 'run' })
        break
      }
    }
  }

  return results
}

export function chooseDiscard(hand: Card[]): Card {
  const melds = findBestMelds(hand)
  const meldCardIds = new Set(melds.flatMap(m => m.cards.map(c => c.id)))
  const loose = hand.filter(c => !meldCardIds.has(c.id))
  const pool = loose.length > 0 ? loose : hand
  return pool.sort((a, b) => cardValue(b) - cardValue(a))[0]
}

export function shouldTakeDiscard(hand: Card[], topDiscard: Card): boolean {
  if (topDiscard.isJoker) return true
  const withDiscard = [...hand, topDiscard]
  return findBestMelds(withDiscard).length > findBestMelds(hand).length
}

/** Returns the sequence of GameActions the AI should take this turn */
export function computeAIActions(state: GameState): GameAction[] {
  const actions: GameAction[] = []
  const cur = state.players[state.currentPlayerIndex]
  const topDiscard = state.discardPile[state.discardPile.length - 1]

  // Draw
  if (topDiscard && shouldTakeDiscard(cur.hand, topDiscard)) {
    actions.push({ type: 'DRAW_FROM_DISCARD' })
  } else {
    actions.push({ type: 'DRAW_FROM_DECK' })
  }

  // After drawing, simulate hand
  const simulatedHand = topDiscard && shouldTakeDiscard(cur.hand, topDiscard)
    ? [...cur.hand, topDiscard]
    : [...cur.hand, { id: '__drawn__', suit: 'spades', rank: '2', isJoker: false } as Card] // placeholder

  // Find melds to lay
  const melds = findBestMelds(simulatedHand)
  for (const meld of melds) {
    // Check if can add to existing table meld first
    let added = false
    for (const tableMeld of state.tableMelds) {
      if (canAddToMeld(tableMeld, meld.cards)) {
        for (const c of meld.cards) {
          actions.push({ type: 'TOGGLE_CARD', cardId: c.id })
        }
        actions.push({ type: 'ADD_TO_MELD', meldId: tableMeld.id })
        added = true
        break
      }
    }
    if (!added) {
      const { valid } = isValidMeld(meld.cards)
      if (valid) {
        for (const c of meld.cards) {
          actions.push({ type: 'TOGGLE_CARD', cardId: c.id })
        }
        actions.push({ type: 'LAY_MELD' })
      }
    }
  }

  // Discard worst card
  const discard = chooseDiscard(simulatedHand)
  actions.push({ type: 'TOGGLE_CARD', cardId: discard.id })
  actions.push({ type: 'DISCARD' })

  return actions
}
