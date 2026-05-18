'use client'

import CardComponent from './Card'
import { Meld } from '@/types/game'

interface Props {
  melds: Meld[]
  playerNames: string[]
  canAddTo?: boolean
  onMeldClick?: (meldId: string) => void
}

export default function TableMelds({ melds, playerNames, canAddTo, onMeldClick }: Props) {
  if (melds.length === 0) {
    return (
      <div className="text-center text-xs py-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
        ยังไม่มีไพ่บนโต๊ะ
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {melds.map(meld => (
        <div
          key={meld.id}
          onClick={() => canAddTo && onMeldClick?.(meld.id)}
          className={[
            'flex items-center gap-1 p-2 rounded-xl border',
            canAddTo ? 'cursor-pointer hover:border-yellow-400/60 border-yellow-400/20 bg-yellow-400/5' : 'border-white/10 bg-white/5',
          ].join(' ')}
        >
          <div className="flex flex-col mr-1 gap-0.5 flex-shrink-0">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {playerNames[meld.ownerIndex] ?? ''}
            </span>
            <span className="text-[10px] px-1 py-0.5 rounded-full bg-white/10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {meld.type === 'set' ? 'เซ็ต' : 'วิ่ง'}
            </span>
          </div>
          {meld.cards.map((card, i) => (
            <CardComponent key={`${card.id}_${i}`} card={card} small />
          ))}
        </div>
      ))}
    </div>
  )
}
