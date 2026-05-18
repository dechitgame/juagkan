import { GameState, GameAction, Player, Meld, Card } from '@/types/game'
import { createDeck, shuffle, cardValue, cardName } from './deck'
import { isValidMeld, canAddToMeld } from './meldValidator'

export function initGame(playerName: string, aiCount: number): GameState {
  const deck = shuffle(createDeck())

  const aiNames = ['หุ่นยนต์ 1', 'หุ่นยนต์ 2', 'หุ่นยนต์ 3']
  const players: Player[] = [
    { id: 'player_0', name: playerName || 'คุณ', hand: [], isAI: false, score: 0 },
    ...Array.from({ length: aiCount }, (_, i) => ({
      id: `ai_${i + 1}`,
      name: aiNames[i],
      hand: [],
      isAI: true,
      score: 0,
    })),
  ]

  const remaining = [...deck]
  for (const p of players) p.hand = remaining.splice(0, 13)
  const firstDiscard = remaining.splice(0, 1)

  return {
    players,
    deck: remaining,
    discardPile: firstDiscard,
    tableMelds: [],
    currentPlayerIndex: 0,
    phase: 'draw',
    selectedCardIds: [],
    winner: null,
    roundNumber: 1,
    log: ['เริ่มเกมใหม่! จั่วไพ่ได้เลย'],
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function nextTurn(s: GameState) {
  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length
  s.phase = 'draw'
  s.selectedCardIds = []
}

function checkWin(s: GameState, playerIndex: number) {
  if (s.players[playerIndex].hand.length === 0) {
    s.phase = 'gameover'
    s.winner = playerIndex
    for (let i = 0; i < s.players.length; i++) {
      if (i !== playerIndex) {
        s.players[i].score += s.players[i].hand.reduce((sum, c) => sum + cardValue(c), 0)
      }
    }
    s.log.push(`🎉 ${s.players[playerIndex].name} ชนะ!`)
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return action.newState

  const s = clone(state)
  const cur = s.players[s.currentPlayerIndex]

  switch (action.type) {
    case 'DRAW_FROM_DECK': {
      if (s.phase !== 'draw') return state
      if (s.deck.length === 0) {
        const top = s.discardPile.pop()!
        s.deck = shuffle(s.discardPile)
        s.discardPile = [top]
        s.log.push('สับไพ่กองทิ้งใหม่')
      }
      if (s.deck.length === 0) {
        s.log.push('ไพ่หมด!')
        return s
      }
      cur.hand.push(s.deck.pop()!)
      s.phase = 'action'
      s.log.push(`${cur.name} จั่วไพ่จากกองคว่ำ`)
      return s
    }

    case 'DRAW_FROM_DISCARD': {
      if (s.phase !== 'draw' || s.discardPile.length === 0) return state
      const card = s.discardPile.pop()!
      cur.hand.push(card)
      s.phase = 'action'
      s.log.push(`${cur.name} จั่ว ${cardName(card)} จากกองทิ้ง`)
      return s
    }

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

    case 'LAY_MELD': {
      if (s.phase !== 'action' || s.selectedCardIds.length < 3) return state
      const selected = cur.hand.filter(c => s.selectedCardIds.includes(c.id))
      const { valid, type } = isValidMeld(selected)
      if (!valid || !type) {
        s.log.push('⚠️ ไพ่ที่เลือกไม่ถูกกติกา')
        return s
      }
      cur.hand = cur.hand.filter(c => !s.selectedCardIds.includes(c.id))
      const meld: Meld = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        cards: selected,
        type,
        ownerIndex: s.currentPlayerIndex,
      }
      s.tableMelds.push(meld)
      s.selectedCardIds = []
      s.log.push(`${cur.name} ลง${type === 'set' ? 'เซ็ต' : 'วิ่ง'} ${selected.map(cardName).join(' ')}`)
      checkWin(s, s.currentPlayerIndex)
      return s
    }

    case 'ADD_TO_MELD': {
      if (s.phase !== 'action' || s.selectedCardIds.length === 0) return state
      const meld = s.tableMelds.find(m => m.id === action.meldId)
      if (!meld) return state
      const selected = cur.hand.filter(c => s.selectedCardIds.includes(c.id))
      if (!canAddToMeld(meld, selected)) {
        s.log.push('⚠️ ใส่ไพ่เพิ่มไม่ได้')
        return s
      }
      cur.hand = cur.hand.filter(c => !s.selectedCardIds.includes(c.id))
      meld.cards.push(...selected)
      s.selectedCardIds = []
      s.log.push(`${cur.name} เพิ่ม ${selected.map(cardName).join(' ')}`)
      checkWin(s, s.currentPlayerIndex)
      return s
    }

    case 'DISCARD': {
      if (s.phase !== 'action' || s.selectedCardIds.length !== 1) return state
      const cardId = s.selectedCardIds[0]
      const idx = cur.hand.findIndex(c => c.id === cardId)
      if (idx === -1) return state
      const [discarded] = cur.hand.splice(idx, 1)
      s.discardPile.push(discarded)
      s.selectedCardIds = []
      s.log.push(`${cur.name} ทิ้ง ${cardName(discarded)}`)
      if (cur.hand.length === 0) {
        checkWin(s, s.currentPlayerIndex)
        return s
      }
      nextTurn(s)
      return s
    }

    default:
      return state
  }
}
