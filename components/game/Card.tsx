'use client'

import { Card } from '@/types/game'

interface CardProps {
  card: Card
  selected?: boolean
  faceDown?: boolean
  small?: boolean
  onClick?: () => void
  disabled?: boolean
}

const SUIT_SYM: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const SUIT_COLOR: Record<string, string> = {
  spades: '#111', hearts: '#dc2626', diamonds: '#dc2626', clubs: '111', joker: '#7c3aed',
}

export default function CardComponent({ card, selected, faceDown, small, onClick, disabled }: CardProps) {
  const w = small ? 'w-9 h-13' : 'w-16 h-24'
  const p = small ? 'p-0.5' : 'p-1.5'
  const fs = small ? 'text-[10px]' : 'text-sm'

  if (faceDown) {
    return (
      <div
        className={`${w} rounded-lg border-2 border-blue-800 flex-shrink-0`}
        style={{ background: 'repeating-linear-gradient(135deg,#1e3a5f 0,#1e3a5f 4px,#162d4a 4px,#162d4a 8px)' }}
      />
    )
  }

  const color = SUIT_COLOR[card.suit] || '#111'
  const sym = card.isJoker ? '' : (SUIT_SYM[card.suit as string] || '')
  const rank = card.isJoker ? '🃏' : card.rank

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={[
        'relative select-none rounded-lg border-2 bg-white flex flex-col justify-between flex-shrink-0',
        w, p, fs,
        selected ? 'border-yellow-400 -translate-y-4 shadow-lg shadow-yellow-400/40 z-10' : 'border-gray-300',
        onClick && !disabled ? 'cursor-pointer hover:-translate-y-1 transition-transform duration-100' : 'cursor-default',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="flex flex-col leading-none" style={{ color }}>
        <span className="font-bold">{rank}</span>
        {!card.isJoker && <span>{sym}</span>}
      </div>
      {!small && !card.isJoker && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ color }}>
          <span className="text-3xl opacity-15">{sym}</span>
        </div>
      )}
      <div className="flex flex-col leading-none rotate-180" style={{ color }}>
        <span className="font-bold">{rank}</span>
        {!card.isJoker && <span>{sym}</span>}
      </div>
    </div>
  )
}
