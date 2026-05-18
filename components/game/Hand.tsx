'use client'

import CardComponent from './Card'
import { Card } from '@/types/game'

interface HandProps {
  cards: Card[]
  selectedIds?: string[]
  isCurrentPlayer?: boolean
  onCardClick?: (cardId: string) => void
  label?: string
  faceDown?: boolean
}

export default function Hand({ cards, selectedIds = [], isCurrentPlayer, onCardClick, label, faceDown }: HandProps) {
  const small = cards.length > 10
  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <span style={{ color: isCurrentPlayer ? '#C9A84C' : 'rgba(255,255,255,0.5)' }}>{label}</span>
          {isCurrentPlayer && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
              ตาของคุณ
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-1">
        {cards.map(card => (
          <CardComponent
            key={card.id}
            card={card}
            faceDown={faceDown}
            selected={selectedIds.includes(card.id)}
            small={small}
            onClick={isCurrentPlayer && onCardClick ? () => onCardClick(card.id) : undefined}
          />
        ))}
        {cards.length === 0 && (
          <span className="text-xs text-green-400 py-2">ไพ่หมด!</span>
        )}
      </div>
    </div>
  )
}
