import { GameState, GameAction, Meld, Card } from '@/types/game'
import { createDeck, shuffle, cardName, cardScore, isSpato } from './deck'
import { isValidMeld, canAddToMeld, findKnockResult, canDiscardBePickedForMeld } from './meldValidator'
import { Character } from './characters'

// จำนวนไพ่ที่แจกต่อคน ตามจำนวนผู้เล่น
function handSize(playerCount: number): number {
  if (playerCount <= 2) return 11
  if (playerCount === 3) return 9
  return 7
}

export function initGame(playerName: string, characters: Character[]): GameState {
  const playerCount = 1 + characters.length
  const size = handSize(playerCount)
  const deck = shuffle(createDeck())

  const players = [
    { id: 'player_0', name: playerName || 'คุณ', hand: [] as Card[], isAI: false, score: 0, hasLaid: false },
    ...characters.map((c, i) => ({
      id: `ai_${i + 1}`,
      name: c.name,
      hand: [] as Card[],
      isAI: true,
      score: 0,
      hasLaid: false,
    })),
  ]

  const remaining = [...deck]
  for (const p of players) {
    p.hand = remaining.splice(0, size)
  }

  const firstDiscard = remaining.splice(0, 1)

  return {
    players,
    deck: remaining,
    discardPile: firstDiscard,
    tableMelds: [],
    currentPlayerIndex: 0,
    phase: 'draw',
    selectedCardIds: [],
    tookDiscardThisTurn: false,
    headCardId: firstDiscard[0]?.id ?? null,
    winner: null,
    isDarkKnock: false,
    isColorKnock: false,
    knockMultiplier: 1,
    roundScores: new Array(playerCount).fill(0),
    roundNumber: 1,
    turnCount: 0,
    log: ['เริ่มเกมใหม่! 🃏'],
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

const MAX_TURNS = 60

function nextTurn(s: GameState) {
  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length
  s.phase = 'draw'
  s.selectedCardIds = []
  s.tookDiscardThisTurn = false
  s.turnCount++
}

// ─── ตรวจน็อคสี: ไพ่ทุกชุดของผู้น็อคเป็นดอกเดียวกัน ─────────────────────────
function detectColorKnock(s: GameState, ownerIndex: number): boolean {
  const myMelds = s.tableMelds.filter(m => m.ownerIndex === ownerIndex)
  if (myMelds.length === 0) return false
  const allCards = myMelds.flatMap(m => m.cards)
  if (allCards.length === 0) return false
  const firstSuit = allCards[0].suit
  return allCards.every(c => c.suit === firstSuit)
}

// ─── คำนวณแต้มเมื่อมีคนน็อค ───────────────────────────────────────────────────
function resolveKnock(s: GameState, knockerIdx: number, isDark: boolean) {
  s.phase = 'gameover'
  s.winner = knockerIdx
  s.isDarkKnock = isDark

  // ตรวจน็อคสี
  const isColor = detectColorKnock(s, knockerIdx)
  s.isColorKnock = isColor

  // Multiplier: มืดสี×4, มืด/สี×2, ปกติ×1
  const mult = (isDark && isColor) ? 4 : (isDark || isColor) ? 2 : 1
  s.knockMultiplier = mult

  // Zero-sum scoring: ผู้แพ้จ่ายแต้มให้ผู้ชนะโดยตรง ไม่มี floating bonus
  let knockerGain = 0
  for (let i = 0; i < s.players.length; i++) {
    if (i === knockerIdx) continue

    const hand = s.players[i].hand
    let loss = hand.reduce((sum, c) => sum + cardScore(c, s.headCardId), 0)

    // อมสปาโต: โทษเพิ่มอีก 50 ต่อใบ (ยังถือในมือ)
    loss += hand.filter(c => isSpato(c)).length * 50

    const totalLoss = loss * mult
    s.players[i].score -= totalLoss
    s.roundScores[i] = (s.roundScores[i] ?? 0) - totalLoss
    knockerGain += loss
  }

  knockerGain *= mult
  s.players[knockerIdx].score += knockerGain
  s.roundScores[knockerIdx] = (s.roundScores[knockerIdx] ?? 0) + knockerGain

  const tag = (isDark && isColor) ? '🌑🎨 น็อคมืดสี'
    : isDark ? '🌑 น็อคมืด'
    : isColor ? '🎨 น็อคสี'
    : '🃏 น็อค'
  const multTag = mult > 1 ? ` (×${mult})` : ''
  s.log.push(`${tag}! ${s.players[knockerIdx].name} ชนะ! +${knockerGain} แต้ม${multTag}`)
}

// ─── จบเกมเมื่อไพ่หมด คนแต้มน้อยสุดในมือชนะ ──────────────────────────────
function resolveEmptyDeck(s: GameState) {
  s.phase = 'gameover'
  s.isDarkKnock = false
  s.isColorKnock = false
  s.knockMultiplier = 1
  s.log.push('🃏 ไพ่หมดกอง! นับแต้มในมือ')

  const handScores = s.players.map((p, i) => ({
    idx: i,
    total: p.hand.reduce((sum, c) => sum + cardScore(c, s.headCardId), 0)
      + p.hand.filter(c => isSpato(c)).length * 50,
  }))

  const minScore = Math.min(...handScores.map(h => h.total))
  const winnerIdx = handScores.find(h => h.total === minScore)!.idx
  s.winner = winnerIdx

  let winnerGain = 0
  for (const { idx, total } of handScores) {
    if (idx === winnerIdx) continue
    const loss = total - minScore
    s.players[idx].score -= loss
    s.roundScores[idx] = (s.roundScores[idx] ?? 0) - loss
    winnerGain += loss
  }
  s.players[winnerIdx].score += winnerGain
  s.roundScores[winnerIdx] = (s.roundScores[winnerIdx] ?? 0) + winnerGain

  s.log.push(`🏆 ${s.players[winnerIdx].name} ชนะด้วยไพ่แต้มน้อยสุด (${minScore} แต้ม)`)
}

// ─── Reducer หลัก ────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return action.newState

  const s = clone(state)
  const cur = s.players[s.currentPlayerIndex]

  switch (action.type) {

    // ── จั่วจากกองคว่ำ ────────────────────────────────────────────────────────
    case 'DRAW_FROM_DECK': {
      s.tookDiscardThisTurn = false
      if (s.phase !== 'draw') return state
      if (s.deck.length === 0) {
        if (s.discardPile.length > 1) {
          // สับกองทิ้งเป็นกองใหม่ (เก็บใบบนสุดไว้)
          const top = s.discardPile.pop()!
          s.deck = shuffle(s.discardPile)
          s.discardPile = [top]
          s.log.push('🔄 สับไพ่กองทิ้งใหม่')
        } else {
          // ไพ่หมดจริง → จบเกม
          resolveEmptyDeck(s)
          return s
        }
      }
      const drawn = s.deck.pop()!
      cur.hand.push(drawn)
      s.phase = 'action'
      s.log.push(`${cur.name} จั่วไพ่`)
      return s
    }

    // ── หยิบจากกองทิ้ง ────────────────────────────────────────────────────────
    // กติกา: เก็บได้ก็ต่อเมื่อนำไพ่นั้นไปเกิดได้ทันที (ทุกคน ไม่เกี่ยวมืด/สว่าง)
    case 'TAKE_DISCARD': {
      if (s.phase !== 'draw' || s.discardPile.length === 0) return state
      const topCard = s.discardPile[s.discardPile.length - 1]
      // อนุญาต: (1) เกิดได้ทันที หรือ (2) สว่างแล้ว + ฝากเดี่ยวได้
      const canMeld = canDiscardBePickedForMeld(topCard, cur.hand)
      const canFak = cur.hasLaid && s.tableMelds.some(m => canAddToMeld(m, [topCard]))
      if (!canMeld && !canFak) {
        s.log.push('⚠️ ต้องเกิดหรือฝากได้ทันที จึงจะเก็บจากกองทิ้งได้')
        return state
      }
      const card = s.discardPile.pop()!
      cur.hand.push(card)
      s.tookDiscardThisTurn = true
      s.phase = 'action'
      s.log.push(`${cur.name} หยิบ ${cardName(card)} ${canMeld ? 'เพื่อเกิด' : 'เพื่อฝาก'}`)
      return s
    }

    // ── เลือก / ยกเลิกเลือกไพ่ ───────────────────────────────────────────────
    case 'TOGGLE_CARD': {
      if (s.phase !== 'action') return state
      const idx = s.selectedCardIds.indexOf(action.cardId)
      if (idx === -1) s.selectedCardIds.push(action.cardId)
      else s.selectedCardIds.splice(idx, 1)
      return s
    }

    case 'CLEAR_SELECTION': {
      s.selectedCardIds = []
      return s
    }

    // ── วางชุดไพ่ใหม่บนโต๊ะ (เกิด) ───────────────────────────────────────────
    case 'LAY_MELD': {
      if (s.phase !== 'action') return state
      if (s.selectedCardIds.length < 3) return state

      const selected = cur.hand.filter(c => s.selectedCardIds.includes(c.id))

      const { valid, type } = isValidMeld(selected)
      if (!valid || !type) {
        s.log.push('⚠️ ไพ่ที่เลือกไม่ถูกกติกา (ต้องเป็นตองหรือเรียงดอกเดียว ≥3 ใบ)')
        return s
      }

      cur.hand = cur.hand.filter(c => !s.selectedCardIds.includes(c.id))
      s.tableMelds.push({
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        cards: selected,
        type,
        ownerIndex: s.currentPlayerIndex,
      })
      s.selectedCardIds = []
      cur.hasLaid = true
      s.tookDiscardThisTurn = false
      s.phase = 'action'
      s.log.push(`${cur.name} ลง${type === 'set' ? 'ตอง' : 'เรียง'} ${selected.map(cardName).join(' ')}`)
      // ⭐ ไพ่หัว: บันทึกว่าใช้แล้ว — bonus จะคิดตอน resolveKnock (ไม่บวกกลางเกมเพื่อรักษา zero-sum)
      return s
    }

    // ── ฝาก — ต่อยอดชุดที่มีอยู่แล้ว ─────────────────────────────────────────
    case 'ADD_TO_MELD': {
      if (s.phase !== 'action') return state
      if (s.selectedCardIds.length === 0) return state
      // กติกา: ฝากได้ต่อเมื่อเคยวางชุดของตัวเองแล้ว (hasLaid=true)
      if (!cur.hasLaid) {
        s.log.push('⚠️ ต้องเกิดก่อนจึงจะฝากได้')
        return state
      }
      const meld = s.tableMelds.find(m => m.id === action.meldId)
      if (!meld) return state

      const selected = cur.hand.filter(c => s.selectedCardIds.includes(c.id))
      if (!canAddToMeld(meld, selected)) {
        s.log.push('⚠️ ฝากไม่ได้ (ต่อไม่ติด)')
        return s
      }

      cur.hand = cur.hand.filter(c => !s.selectedCardIds.includes(c.id))
      meld.cards.push(...selected)
      s.selectedCardIds = []
      cur.hasLaid = true
      s.tookDiscardThisTurn = false
      s.log.push(`${cur.name} ฝาก ${selected.map(cardName).join(' ')}`)
      // ⭐ ไพ่หัว: bonus คิดตอน resolveKnock เท่านั้น (zero-sum)
      return s
    }

    // ── ทิ้งไพ่ — จบตา ────────────────────────────────────────────────────────
    case 'DISCARD': {
      if (s.phase !== 'action' || s.selectedCardIds.length !== 1) return state
      // BUG #1 fix: หยิบจากกองทิ้งแล้ว ต้องเกิด (LAY_MELD) ก่อนทิ้งได้
      if (s.tookDiscardThisTurn && !cur.hasLaid) {
        s.log.push('⚠️ ต้องวางชุดก่อนทิ้ง (หยิบจากกองทิ้งแล้ว)')
        return state
      }
      const cardId = s.selectedCardIds[0]
      const idx = cur.hand.findIndex(c => c.id === cardId)
      if (idx === -1) return state

      const [discarded] = cur.hand.splice(idx, 1)
      s.discardPile.push(discarded)
      s.selectedCardIds = []
      s.log.push(`${cur.name} ทิ้ง ${cardName(discarded)}`)

      // Zero-sum: ไม่มีโทษลอยตัวกลางเกม — แต้มทุกบาทมาจากผู้แพ้ ณ จบเกม
      nextTurn(s)
      // MAX_TURNS cap — จบเกมอัตโนมัติเมื่อเกิน 60 ตา (ป้องกัน infinite loop)
      if (s.turnCount >= MAX_TURNS) {
        s.log.push(`⏱️ ครบ ${MAX_TURNS} ตา — จบเกม!`)
        resolveEmptyDeck(s)
      }
      return s
    }

    // ── น็อค — คว่ำไพ่ ชนะทันที ──────────────────────────────────────────────
    case 'KNOCK': {
      if (s.phase !== 'action') return state

      // ── Normal knock: เหลือ 1 ใบในมือ (วางชุดมาแล้ว) ──
      if (cur.hand.length === 1) {
        const lastCard = cur.hand[0]
        cur.hand = []
        s.discardPile.push(lastCard)
        const isDark = !cur.hasLaid // hasLaid=false แปลว่า 1 ใบมาจากมือตัวเองล้วน
        s.log.push(isDark ? `🌑 ${cur.name} น็อคมืด!` : `🃏 ${cur.name} น็อค!`)
        resolveKnock(s, s.currentPlayerIndex, isDark)
        return s
      }

      // ── Dark knock: ยังไม่เคยวาง + ไพ่ทั้งหมดจัดชุดได้ยกเว้น 1 ──
      if (!cur.hasLaid) {
        const knockRes = findKnockResult(cur.hand)
        if (!knockRes) {
          s.log.push('⚠️ น็อคมืดไม่ได้ (ยังจัดชุดไม่ครบ)')
          return s
        }
        const { knockCard, melds: darkMelds } = knockRes
        cur.hand = []
        s.discardPile.push(knockCard)

        // วาง melds ที่ซ่อนไว้บนโต๊ะ (เพื่อตรวจน็อคสี + แสดงผล)
        for (const meldCards of darkMelds) {
          const { type } = isValidMeld(meldCards)
          if (type) {
            s.tableMelds.push({
              id: `dark_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              cards: meldCards,
              type,
              ownerIndex: s.currentPlayerIndex,
            })
          }
        }
        s.log.push(`🌑 ${cur.name} น็อคมืด!`)
        resolveKnock(s, s.currentPlayerIndex, true)
        return s
      }

      return state
    }

    default:
      return state
  }
}
