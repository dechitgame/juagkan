'use client'

import { useRef, useState } from 'react'
import CardComponent from './Card'
import { Card } from '@/types/game'

interface HandProps {
  cards: Card[]
  selectedIds?: string[]
  isCurrentPlayer?: boolean
  onCardClick?: (cardId: string) => void
  label?: string
  faceDown?: boolean
  onReorder?: (fromIndex: number, toIndex: number) => void
}

export default function Hand({
  cards, selectedIds = [], isCurrentPlayer, onCardClick, label, faceDown, onReorder,
}: HandProps) {
  const small = cards.length > 10
  const dragFrom = useRef<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  function handleDragStart(index: number) {
    dragFrom.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    if (dragFrom.current === null || !onReorder) return
    e.preventDefault()
    setDropAt(index)
  }

  function handleDrop(toIndex: number) {
    if (dragFrom.current !== null && dragFrom.current !== toIndex && onReorder) {
      onReorder(dragFrom.current, toIndex)
    }
    dragFrom.current = null
    setDropAt(null)
  }

  function handleDragEnd() {
    dragFrom.current = null
    setDropAt(null)
  }

  // Touch swap: แตะ 2 ครั้งเพื่อสลับ (สำหรับมือถือ)
  const touchPick = useRef<number | null>(null)
  const [touchPickIndex, setTouchPickIndex] = useState<number | null>(null)

  function handleTouchTap(index: number) {
    if (!onReorder || faceDown) return
    if (touchPick.current === null) {
      // ยังไม่ได้เลือก → เลือกไพ่นี้
      touchPick.current = index
      setTouchPickIndex(index)
    } else if (touchPick.current === index) {
      // แตะซ้ำ → ยกเลิก
      touchPick.current = null
      setTouchPickIndex(null)
    } else {
      // มีไพ่ที่เลือกอยู่แล้ว → สลับ
      onReorder(touchPick.current, index)
      touchPick.current = null
      setTouchPickIndex(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <span style={{ color: isCurrentPlayer ? '#C9A84C' : 'rgba(255,255,255,0.5)' }}>{label}</span>
          {isCurrentPlayer && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
              ตาของคุณ
            </span>
          )}
          {onReorder && !faceDown && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
              ↔ ลากเพื่อเรียง
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-1">
        {cards.map((card, index) => {
          const isDropTarget = dropAt === index && dragFrom.current !== null && dragFrom.current !== index
          const isTouchPicked = touchPickIndex === index
          const isDragging = dragFrom.current === index

          return (
            <div
              key={card.id}
              className="relative transition-all duration-100"
              style={{
                marginLeft: isDropTarget ? '12px' : undefined,
                opacity: isDragging ? 0.4 : 1,
                outline: isTouchPicked ? '2px solid #C9A84C' : undefined,
                borderRadius: '8px',
                cursor: onReorder && !faceDown ? 'grab' : undefined,
              }}
              // ── Desktop drag ──
              draggable={!!onReorder && !faceDown}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={() => setDropAt(null)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              // ── Mobile tap-swap ──
              onDoubleClick={() => handleTouchTap(index)}
            >
              <CardComponent
                card={card}
                faceDown={faceDown}
                selected={selectedIds.includes(card.id)}
                small={small}
                onClick={isCurrentPlayer && onCardClick ? () => onCardClick(card.id) : undefined}
              />
            </div>
          )
        })}

        {cards.length === 0 && (
          <span className="text-xs text-green-400 py-2">ไพ่หมด!</span>
        )}
      </div>

      {/* คำแนะนำมือถือ */}
      {onReorder && !faceDown && touchPickIndex !== null && (
        <p className="text-xs animate-pulse" style={{ color: '#C9A84C' }}>
          แตะ 2 ครั้งที่ไพ่อื่นเพื่อสลับตำแหน่ง
        </p>
      )}
    </div>
  )
}
