import { GameState, GameAction, Card } from '@/types/game'
import { RANK_ORDER, cardScore } from './deck'
import { isValidMeld, canAddToMeld, findKnockResult, canDiscardBePickedForMeld } from './meldValidator'

interface MeldCandidate {
  cards: Card[]
  type: 'set' | 'run'
}

// ─── หาชุดไพ่ที่ดีที่สุดจากไพ่ในมือ (greedy) ────────────────────────────────
export function findBestMelds(hand: Card[]): MeldCandidate[] {
  const results: MeldCandidate[] = []
  const used = new Set<string>()

  // หาตอง (rank เดียวกัน ≥3 ใบ คนละดอก)
  const byRank: Record<string, Card[]> = {}
  for (const c of hand) {
    if (!byRank[c.rank]) byRank[c.rank] = []
    byRank[c.rank].push(c)
  }
  for (const cards of Object.values(byRank)) {
    const unique: Card[] = []
    const suits = new Set<string>()
    for (const c of cards) {
      if (!suits.has(c.suit)) { unique.push(c); suits.add(c.suit) }
    }
    if (unique.length >= 3) {
      const meld = unique.slice(0, 4)
      const { valid } = isValidMeld(meld)
      if (valid) {
        results.push({ cards: meld, type: 'set' })
        meld.forEach(c => used.add(c.id))
      }
    }
  }

  // หาเรียง (ดอกเดียวกัน เรียงต่อเนื่อง ≥3 ใบ)
  const bySuit: Record<string, Card[]> = {}
  for (const c of hand) {
    if (used.has(c.id)) continue
    if (!bySuit[c.suit]) bySuit[c.suit] = []
    bySuit[c.suit].push(c)
  }
  for (const cards of Object.values(bySuit)) {
    const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank])
    let run: Card[] = []
    for (const card of sorted) {
      if (run.length === 0) {
        run = [card]
      } else {
        const last = run[run.length - 1]
        if (RANK_ORDER[card.rank] - RANK_ORDER[last.rank] === 1) {
          run.push(card)
        } else {
          if (run.length >= 3) {
            results.push({ cards: [...run], type: 'run' })
            run.forEach(c => used.add(c.id))
          }
          run = [card]
        }
      }
    }
    if (run.length >= 3) results.push({ cards: [...run], type: 'run' })
  }

  return results
}

// ─── ตรวจว่าหยิบกองทิ้งแล้วเกิดได้ทันที ────────────────────────────────────
// ใช้ canDiscardBePickedForMeld (exhaustive) แทน findBestMelds (greedy) เพื่อความแม่นยำ
export function canTakeDiscardToMeld(hand: Card[], topDiscard: Card): MeldCandidate | null {
  if (!canDiscardBePickedForMeld(topDiscard, hand)) return null
  // หา meld candidate สำหรับ AI planning
  const withDiscard = [...hand, topDiscard]
  const melds = findBestMelds(withDiscard)
  return melds.find(m => m.cards.some(c => c.id === topDiscard.id)) ?? { cards: [topDiscard], type: 'set' }
}

// ─── เลือกไพ่ที่จะทิ้ง (หลีกเลี่ยงทิ้งมี่ถ้าทำได้) ─────────────────────────
export function chooseDiscard(
  hand: Card[],
  headCardId: string | null,
  nextPlayerHand?: Card[],
): Card {
  const melds = findBestMelds(hand)
  const meldCardIds = new Set(melds.flatMap(m => m.cards.map(c => c.id)))
  const loose = hand.filter(c => !meldCardIds.has(c.id))
  const pool = loose.length > 0 ? loose : hand

  if (nextPlayerHand && nextPlayerHand.length > 0) {
    // ลองหลีกเลี่ยงทิ้งมี่
    const safe = pool.filter(c => !canDiscardBePickedForMeld(c, nextPlayerHand))
    if (safe.length > 0) {
      return safe.sort((a, b) => cardScore(b, headCardId) - cardScore(a, headCardId))[0]
    }
  }

  // ทิ้งแต้มสูงสุด (โดยเฉพาะสปาโต)
  return pool.sort((a, b) => cardScore(b, headCardId) - cardScore(a, headCardId))[0]
}

// ─── คำนวณ action สำหรับ phase='draw' ────────────────────────────────────────
// คืนแค่ action การจั่ว/หยิบ — post-draw actions ใช้ computePostDrawActions แทน
export function computeAIActions(state: GameState): GameAction[] {
  if (state.phase !== 'draw') return []

  const cur = state.players[state.currentPlayerIndex]
  const topDiscard = state.discardPile[state.discardPile.length - 1]

  // เก็บได้ก็ต่อเมื่อเกิดได้ทันที (ทุกคน ไม่เกี่ยวมืด/สว่าง)
  if (topDiscard && canTakeDiscardToMeld(cur.hand, topDiscard)) {
    return [{ type: 'TAKE_DISCARD' }]
  }
  return [{ type: 'DRAW_FROM_DECK' }]
}

// ─── คำนวณ action หลังจาก draw แล้ว (phase='action' หรือ 'must_lay') ──────────
// ใช้ใน page.tsx phase 2 เพื่อให้รู้ไพ่ที่จั่วมาแล้ว
export function computePostDrawActions(state: GameState): GameAction[] {
  const actions: GameAction[] = []
  const cur = state.players[state.currentPlayerIndex]
  const headCardId = state.headCardId
  const nextIdx = (state.currentPlayerIndex + 1) % state.players.length
  const nextPlayerHand = state.players[nextIdx]?.hand ?? []

  let workingHand = [...cur.hand]

  // ── เช็คน็อคมืด (ก่อนวางอะไร — ยังไม่มี hasLaid) ──────────────────────────
  if (!cur.hasLaid) {
    const knockRes = findKnockResult(workingHand)
    if (knockRes) {
      actions.push({ type: 'KNOCK' })
      return actions
    }
  }

  // ── วางชุดไพ่ทั้งหมดที่ทำได้ ────────────────────────────────────────────────
  let laid = true
  while (laid) {
    laid = false
    const melds = findBestMelds(workingHand)
    for (const meld of melds) {
      const { valid } = isValidMeld(meld.cards)
      if (!valid) continue

      // ลองฝากก่อน
      let fakked = false
      for (const tableMeld of state.tableMelds) {
        if (canAddToMeld(tableMeld, meld.cards)) {
          for (const c of meld.cards) actions.push({ type: 'TOGGLE_CARD', cardId: c.id })
          actions.push({ type: 'ADD_TO_MELD', meldId: tableMeld.id })
          workingHand = workingHand.filter(c => !meld.cards.some(m => m.id === c.id))
          laid = true
          fakked = true
          break
        }
      }

      if (!fakked) {
        for (const c of meld.cards) actions.push({ type: 'TOGGLE_CARD', cardId: c.id })
        actions.push({ type: 'LAY_MELD' })
        workingHand = workingHand.filter(c => !meld.cards.some(m => m.id === c.id))
        laid = true
      }

      break
    }
  }

  // ── น็อคหรือทิ้ง ──────────────────────────────────────────────────────────
  if (workingHand.length === 1) {
    actions.push({ type: 'KNOCK' })
  } else {
    const discard = chooseDiscard(workingHand, headCardId, nextPlayerHand)
    actions.push({ type: 'TOGGLE_CARD', cardId: discard.id })
    actions.push({ type: 'DISCARD' })
  }

  return actions
}
