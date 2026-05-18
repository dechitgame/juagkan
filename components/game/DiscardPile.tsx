'use client'

import CardComponent from './Card'
import { Card } from '@/types/game'

interface Props {
  topCard?: Card
  deckCount: number
  canDraw: boolean
  onDrawFromDeck: () => void
  onDrawFromDiscard: () => void
}

export default function DiscardPile({ topCard, deckCount, canDraw, onDrawFromDeck, onDrawFromDiscard }: Props) {
  return (
    <div className="flex gap-8 items-end justify-center">
      {/* Deck */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={canDraw ? onDrawFromDeck : undefined}
          disabled={!canDraw}
          className="relative disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
        >
          <div
            className="w-16 h-24 rounded-lg border-2 border-blue-700 flex items-center justify-center text-blue-300 font-bold text-lg"
            style={{ background: 'repeating-linear-gradient(135deg,#1e3a5f 0,#1e3a5f 4px,#162d4a 4px,#162d4a 8px)' }}
          >
            {deckCount}
          </div>
        </button>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>กองคว่ำ</span>
      </div>

      {/* Discard */}
      <div className="flex flex-col items-center gap-1.5">
        <div
          onClick={canDraw && topCard ? onDrawFromDiscard : undefined}
          className={canDraw && topCard ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}
        >
          {topCard ? (
            <CardComponent card={topCard} />
          ) : (
            <div className="w-16 h-24 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/20 text-xs">
              ว่าง
            </div>
          )}
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>กองทิ้ง</span>
      </div>
    </div>
  )
}
