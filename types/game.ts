export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  id: string
  suit: Suit | 'joker'
  rank: Rank | 'JOKER'
  isJoker: boolean
}

export interface Meld {
  id: string
  cards: Card[]
  type: 'set' | 'run'
  ownerIndex: number
}

export interface Player {
  id: string
  name: string
  hand: Card[]
  isAI: boolean
  score: number
}

export type GamePhase = 'draw' | 'action' | 'gameover'

export interface GameState {
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  tableMelds: Meld[]
  currentPlayerIndex: number
  phase: GamePhase
  selectedCardIds: string[]
  winner: number | null
  roundNumber: number
  log: string[]
}

export type GameAction =
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'DRAW_FROM_DISCARD' }
  | { type: 'TOGGLE_CARD'; cardId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'LAY_MELD' }
  | { type: 'ADD_TO_MELD'; meldId: string }
  | { type: 'DISCARD' }
  | { type: 'RESET'; newState: GameState }
