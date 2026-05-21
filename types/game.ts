export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
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
  score: number       // คะแนนสะสมทุกรอบ
  hasLaid: boolean    // เคยวางชุดบนโต๊ะในรอบนี้ (ตรวจน็อคมืด)
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
  tookDiscardThisTurn: boolean      // true = จั่วจากกองทิ้งตาปัจจุบัน (มืดเกิดได้)
  headCardId: string | null         // ไพ่หัว (ใบแรกที่เปิด) = 50 แต้ม
  winner: number | null
  isDarkKnock: boolean              // น็อคมืด — ไม่เคยวางเลยตลอดเกม
  isColorKnock: boolean             // น็อคสี — ไพ่ทุกชุดดอกเดียวกัน
  knockMultiplier: number           // 1=ปกติ, 2=มืด/สี, 4=มืดสี
  roundScores: number[]             // แต้มรอบนี้ต่อผู้เล่น (รวม penalty ระหว่างเกม)
  roundNumber: number
  log: string[]
}

export type GameAction =
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'TAKE_DISCARD' }                    // หยิบกองทิ้ง (ต้องเกิดทันที)
  | { type: 'CANCEL_TAKE_DISCARD' }             // วางไพ่คืน ถ้าจัดไม่ได้
  | { type: 'TOGGLE_CARD'; cardId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'LAY_MELD' }                        // วางชุดใหม่ (เกิด / วางเพิ่ม)
  | { type: 'ADD_TO_MELD'; meldId: string }     // ฝากต่อชุดที่มีอยู่
  | { type: 'DISCARD' }                         // ทิ้งไพ่ 1 ใบ จบตา
  | { type: 'KNOCK' }                           // น็อค — คว่ำไพ่ใบสุดท้าย ชนะทันที
  | { type: 'RESET'; newState: GameState }
