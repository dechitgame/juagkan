'use client'

import { useReducer, useEffect, useState, useCallback } from 'react'
import { gameReducer, initGame } from '@/lib/game/gameEngine'
import { computeAIActions } from '@/lib/game/aiPlayer'
import { GameState } from '@/types/game'
import Hand from '@/components/game/Hand'
import TableMelds from '@/components/game/TableMelds'
import DiscardPile from '@/components/game/DiscardPile'
import Link from 'next/link'

// ───── Start Screen ─────
function StartScreen({ onStart }: { onStart: (aiCount: 1 | 2 | 3) => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 game-table">
      <div className="text-center space-y-6 max-w-xs w-full">
        <div>
          <div className="text-5xl mb-2">🃏</div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--gold2)' }}>จั่วกัน</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>เลือกจำนวน AI</p>
        </div>
        <div className="space-y-3">
          {([1, 2, 3] as const).map(n => (
            <button key={n} onClick={() => onStart(n)} className="btn-gold w-full py-3">
              🤖 {n} AI ({n + 1} คนบนโต๊ะ)
            </button>
          ))}
        </div>
        <Link href="/" className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>← กลับหน้าหลัก</Link>
      </div>
    </main>
  )
}

// ───── Game Over Screen ─────
function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const winner = state.winner !== null ? state.players[state.winner] : null
  return (
    <main className="min-h-screen flex items-center justify-center px-4 game-table">
      <div className="card-glass p-8 text-center max-w-sm w-full space-y-5">
        <div className="text-5xl">{winner?.isAI ? '😢' : '🎉'}</div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--gold2)' }}>
          {winner ? `${winner.name} ชนะ!` : 'เสมอ'}
        </h2>
        <div className="space-y-2">
          {state.players.map((p, i) => (
            <div key={i} className="flex justify-between text-sm px-2">
              <span style={{ color: i === state.winner ? 'var(--gold)' : 'rgba(255,255,255,0.6)' }}>
                {i === state.winner ? '👑 ' : ''}{p.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {i === state.winner ? 'ชนะ' : `−${state.players[i].score} แต้ม`}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onRestart} className="btn-gold flex-1">เล่นใหม่</button>
          <Link href="/" className="btn-outline flex-1 text-center text-sm py-2.5">หน้าหลัก</Link>
        </div>
      </div>
    </main>
  )
}

// ───── Main Game ─────
export default function PlayPage() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [aiCount, setAiCount] = useState<1 | 2 | 3>(1)
  const [aiThinking, setAiThinking] = useState(false)

  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState)

  function startGame(count: 1 | 2 | 3) {
    setAiCount(count)
    const fresh = initGame('คุณ', count)
    dispatch({ type: 'RESET', newState: fresh })
    setGameState(fresh)
  }

  // AI turn
  useEffect(() => {
    if (!state || state.phase === 'gameover') return
    const cur = state.players[state.currentPlayerIndex]
    if (!cur.isAI) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      const actions = computeAIActions(state)
      let s = state
      for (const action of actions) {
        s = gameReducer(s, action)
      }
      dispatch({ type: 'RESET', newState: s })
      setAiThinking(false)
    }, 900)
    return () => clearTimeout(timer)
  }, [state?.currentPlayerIndex, state?.phase])

  if (!state || !gameState) {
    return <StartScreen onStart={startGame} />
  }

  if (state.phase === 'gameover') {
    return <GameOverScreen state={state} onRestart={() => setGameState(null)} />
  }

  const human = state.players[0]
  const isHumanTurn = state.currentPlayerIndex === 0
  const topDiscard = state.discardPile[state.discardPile.length - 1]
  const opponents = state.players.slice(1)

  return (
    <main className="game-table flex flex-col min-h-screen select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/" className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>← ออก</Link>
        <div className="flex gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {state.players.map((p, i) => (
            <span key={i} style={{ color: i === state.currentPlayerIndex ? 'var(--gold)' : undefined }}>
              {p.name}: {p.hand.length}ใบ
            </span>
          ))}
        </div>
      </div>

      {/* Opponents */}
      <div className="px-4 pt-3 space-y-3">
        {opponents.map(p => (
          <Hand
            key={p.id}
            cards={p.hand}
            faceDown
            label={`${p.name} (${p.hand.length} ใบ)`}
            isCurrentPlayer={false}
          />
        ))}
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-2">
        <div className="w-full max-w-2xl">
          <div className="text-xs text-center mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ไพ่บนโต๊ะ {state.tableMelds.length > 0 ? `(${state.tableMelds.length} ชุด)` : ''}
          </div>
          <TableMelds
            melds={state.tableMelds}
            playerNames={state.players.map(p => p.name)}
            canAddTo={isHumanTurn && state.phase === 'action' && state.selectedCardIds.length > 0}
            onMeldClick={id => dispatch({ type: 'ADD_TO_MELD', meldId: id })}
          />
        </div>

        <DiscardPile
          topCard={topDiscard}
          deckCount={state.deck.length}
          canDraw={isHumanTurn && state.phase === 'draw'}
          onDrawFromDeck={() => dispatch({ type: 'DRAW_FROM_DECK' })}
          onDrawFromDiscard={() => dispatch({ type: 'DRAW_FROM_DISCARD' })}
        />

        {aiThinking && (
          <p className="text-sm animate-pulse" style={{ color: 'var(--gold)' }}>
            {state.players[state.currentPlayerIndex].name} กำลังคิด…
          </p>
        )}
        {!isHumanTurn && !aiThinking && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            รอ {state.players[state.currentPlayerIndex].name}…
          </p>
        )}
      </div>

      {/* Action buttons */}
      {isHumanTurn && state.phase === 'action' && (
        <div className="flex gap-2 justify-center px-4 pb-2 flex-wrap">
          <button
            onClick={() => dispatch({ type: 'LAY_MELD' })}
            disabled={state.selectedCardIds.length < 3}
            className="btn-gold px-5 py-2 text-sm disabled:opacity-30"
          >
            ลงไพ่ ({state.selectedCardIds.length})
          </button>
          <button
            onClick={() => dispatch({ type: 'DISCARD' })}
            disabled={state.selectedCardIds.length !== 1}
            className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-30"
            style={{ background: state.selectedCardIds.length === 1 ? '#dc2626' : '#555', color: 'white' }}
          >
            ทิ้ง
          </button>
          {state.selectedCardIds.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
              className="px-4 py-2 rounded-xl text-sm border"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}

      {/* Human hand */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Hand
          cards={human.hand}
          selectedIds={state.selectedCardIds}
          isCurrentPlayer={isHumanTurn && state.phase === 'action'}
          onCardClick={cardId => dispatch({ type: 'TOGGLE_CARD', cardId })}
          label={`${human.name} (${human.hand.length} ใบ)`}
        />
      </div>

      {/* Log */}
      <div className="px-4 pb-2 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {state.log[state.log.length - 1]}
      </div>
    </main>
  )
}
