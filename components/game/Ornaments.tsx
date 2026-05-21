'use client'
import React from 'react'

// CornerFiligree — เส้นลายวิจิตรมุมโต๊ะ
export function CornerFiligree({ size = 64, color = '#d4a84a', opacity = 0.55, rotate = 0, style = {} }: {
  size?: number; color?: string; opacity?: number; rotate?: number; style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64"
      style={{ transform: `rotate(${rotate}deg)`, opacity, pointerEvents: 'none', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
        <path d="M2 2 L2 18 Q2 30 14 30 L30 30" />
        <path d="M2 2 L18 2 Q30 2 30 14 L30 30" />
        <path d="M2 22 Q10 22 10 30" />
        <path d="M22 2 Q22 10 30 10" />
        <circle cx="14" cy="14" r="2" fill={color} stroke="none" />
        <path d="M14 14 Q22 8 30 14 Q24 22 14 14 Z" fill={color} opacity={0.35} stroke="none" />
        <path d="M6 6 L10 10" />
        <path d="M30 30 Q40 30 44 26 Q48 30 44 34 Q40 30 30 30" />
      </g>
    </svg>
  )
}

// Crown — ไอคอนมงกุฎ
export function Crown({ size = 14, color = '#f3d77a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M1 5 L4 9 L8 4 L12 9 L15 5 L14 12 L2 12 Z" fill={color} stroke="#5a3f08" strokeWidth=".5" />
      <circle cx="1.5" cy="5" r="1.2" fill="#b81e35" />
      <circle cx="8" cy="3.5" r="1.2" fill="#b81e35" />
      <circle cx="14.5" cy="5" r="1.2" fill="#b81e35" />
    </svg>
  )
}

// OrnamentDivider — เส้นคั่นทองพร้อมเพชร
export function OrnamentDivider({ width = 180, color = '#d4a84a' }: { width?: number; color?: string }) {
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ord-grad" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset=".25" stopColor={color} stopOpacity=".6" />
          <stop offset=".75" stopColor={color} stopOpacity=".6" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="7" x2={width} y2="7" stroke="url(#ord-grad)" strokeWidth="1" />
      <g transform={`translate(${width / 2 - 7},0)`}>
        <path d="M7 0 L14 7 L7 14 L0 7 Z" fill={color} opacity=".85" />
        <path d="M7 3 L11 7 L7 11 L3 7 Z" fill="#1a1006" />
      </g>
    </svg>
  )
}

// SpetoBadge — badge สเปโต (2♣ Q♠)
export function SpetoBadge({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <div className="brass-pill" style={{
      fontSize: 8, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 2,
      fontWeight: 700, fontFamily: '"Charm", serif', ...style,
    }}>
      <span style={{ fontSize: 7 }}>♣</span>สเปโต
    </div>
  )
}
