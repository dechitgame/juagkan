'use client'

import { useEffect, useReducer, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { gameReducer, initGame } from '@/lib/game/gameEngine'
import { GameState, GameAction } from '@/types/game'
import Hand from '@/components/game/Hand'
import TableMelds from '@/components/game/TableMelds'
import DiscardPile from '@/components/game/DiscardPile'
import Link from 'next/link'

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [seatIndex, setSeatIndex] = useState<number>(0)
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [players, setPlayers] = useState<{ user_id: string; username: string; seat_index: number }[]>([])
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [roomName, setRoomName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState)

  // Load room and subscribe to realtime
  useEffect(() => {
    const sb = createBrowserClient()

    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Fetch room
      const { data: room } = await sb.from('game_rooms').select('*').eq('id', roomId).single()
      if (!room) { router.push('/lobby'); return }
      setRoomName(room.name)
      setMaxPlayers(room.max_players)
      setRoomStatus(room.status)
      setIsHost(room.host_id === user.id)
      if (room.state) dispatch({ type: 'RESET', newState: room.state })

      // Join room if not already in
      const { data: existing } = await sb.from('room_members').select('seat_index').eq('room_id', roomId).eq('user_id', user.id).single()
      if (!existing) {
        const { data: members } = await sb.from('room_members').select('seat_index').eq('room_id', roomId)
        const taken = (members ?? []).map((m: any) => m.seat_index)
        const nextSeat = [0, 1, 2, 3].find(s => !taken.includes(s)) ?? 0
        await sb.from('room_members').insert({ room_id: roomId, user_id: user.id, seat_index: nextSeat })
        await sb.from('game_rooms').update({ player_count: (members?.length ?? 0) + 1 }).eq('id', roomId)
        setSeatIndex(nextSeat)
      } else {
        setSeatIndex(existing.seat_index)
      }

      // Fetch members
      await loadMembers(sb)
    }

    async function loadMembers(sb: ReturnType<typeof createBrowserClient>) {
      const { data } = await sb
        .from('room_members')
        .select('user_id, seat_index, user_profiles!user_id(username)')
        .eq('room_id', roomId)
        .order('seat_index')
      setPlayers((data as any[])?.map(m => ({
        user_id: m.user_id,
        username: m.user_profiles?.username ?? '?',
        seat_index: m.seat_index,
      })) ?? [])
    }

    init()

    const channel = sb.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, payload => {
        const r = payload.new as any
        setRoomStatus(r.status)
        if (r.state) dispatch({ type: 'RESET', newState: r.state })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, () => {
        loadMembers(sb)
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [roomId])

  async function startGame() {
    if (!isHost) return
    const playerNames = players.map(p => p.username)
    const fakeChars = Array.from({ length: Math.max(0, playerNames.length - 1) }, (_, i) => ({
      name: playerNames[i + 1] ?? `ผู้เล่น ${i + 2}`, age: 30, region: '', avatar: '🧑'
    }))
    const gameState = initGame(playerNames[0], fakeChars)
    // Override player names to match room (initGame ตั้งจำนวนไพ่ถูกต้องแล้ว)
    gameState.players = gameState.players.map((p, i) => ({
      ...p,
      name: playerNames[i] ?? p.name,
      isAI: false,
    }))
    const sb = createBrowserClient()
    await sb.from('game_rooms').update({ status: 'playing', state: gameState }).eq('id', roomId)
  }

  async function makeMove(action: GameAction) {
    if (!state) return
    const newState = gameReducer(state, action)
    const sb = createBrowserClient()
    await sb.from('game_rooms').update({ state: newState }).eq('id', roomId)
  }

  // ล็อก landscape เมื่ออยู่ใน playing state
  useEffect(() => {
    if (roomStatus === 'playing') {
      ;(async () => {
        try { await (window.screen as any).orientation.lock('landscape') } catch {}
      })()
    } else {
      try { (window.screen as any).orientation.unlock() } catch {}
    }
  }, [roomStatus])

  const myPlayerIndex = players.findIndex(p => p.user_id === userId)
  const isMyTurn = state && state.currentPlayerIndex === myPlayerIndex
  const topDiscard = state?.discardPile?.[state.discardPile.length - 1]

  if (roomStatus === 'waiting') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 game-table">
        <div className="card-glass p-6 max-w-sm w-full text-center space-y-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--gold2)' }}>{roomName}</h2>
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              ผู้เล่น {players.length}/{maxPlayers}
            </p>
            {players.map(p => (
              <div key={p.user_id} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs" style={{ color: 'var(--gold)' }}>
                  {p.seat_index + 1}
                </span>
                <span className="text-white">{p.username}</span>
                {p.user_id === userId && <span className="text-xs text-green-400">(คุณ)</span>}
              </div>
            ))}
          </div>
          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="btn-gold w-full"
            >
              {players.length < 2 ? 'รอผู้เล่นเพิ่ม…' : '🎮 เริ่มเกม!'}
            </button>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>รอเจ้าของห้องเริ่ม…</p>
          )}
          <Link href="/lobby" className="text-xs block" style={{ color: 'rgba(255,255,255,0.3)' }}>← ออกจากห้อง</Link>
        </div>
      </main>
    )
  }

  if (!state) return <div className="game-table min-h-screen flex items-center justify-center text-white">กำลังโหลด…</div>

  if (state.phase === 'gameover') {
    const winner = state.winner !== null ? state.players[state.winner] : null
    const iWin = state.winner === myPlayerIndex
    return (
      <main className="min-h-screen flex items-center justify-center px-4 game-table">
        <div className="card-glass p-8 text-center max-w-sm w-full space-y-4">
          <div className="text-5xl">{iWin ? '🎉' : '😢'}</div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--gold2)' }}>
            {state.isDarkKnock ? '🌑 น็อคมืด! ' : ''}{winner?.name ?? '?'} ชนะ!
          </h2>
          <div className="space-y-1">
            {state.players.map((p, i) => {
              const rs = state.roundScores?.[i] ?? 0
              return (
                <div key={i} className="flex justify-between text-sm px-2">
                  <span style={{ color: i === state.winner ? 'var(--gold)' : 'rgba(255,255,255,0.6)' }}>{p.name}</span>
                  <span style={{ color: rs > 0 ? '#4ade80' : rs < 0 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                    {rs > 0 ? '+' : ''}{rs}
                  </span>
                </div>
              )
            })}
          </div>
          <Link href="/lobby" className="btn-gold block">กลับ Lobby</Link>
        </div>
      </main>
    )
  }

  return (
    <>
    {/* Portrait overlay */}
    <div className="rotate-prompt" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0A0A0A',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 64, animation: 'rotateTilt 1.6s ease-in-out infinite alternate' }}>📱</div>
      <div style={{ color: '#D4AF37', fontSize: 20, fontWeight: 800 }}>หมุนหน้าจอ</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>
        เกมนี้เล่นในแนวนอนเท่านั้น<br />กรุณาหมุนโทรศัพท์ของคุณ
      </div>
    </div>
    <style>{`@keyframes rotateTilt{from{transform:rotate(0deg)}to{transform:rotate(-90deg)}}`}</style>

    <main style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse 90% 60% at 50% 50%, #1a3a1a 0%, #0d1f0d 60%, #080f08 100%)',
      userSelect: 'none', overflowY: 'auto',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <Link href="/lobby" className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>← ออก</Link>
        <div className="flex gap-2 text-xs flex-wrap justify-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {state.players.map((p, i) => (
            <span key={i} style={{ color: i === state.currentPlayerIndex ? 'var(--gold)' : undefined }}>
              {p.name}: {p.hand.length}ใบ
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {state.players.filter((_, i) => i !== myPlayerIndex).map((p, i) => (
          <Hand key={i} cards={p.hand} faceDown label={`${p.name} (${p.hand.length} ใบ)`} isCurrentPlayer={false} />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-2">
        <TableMelds
          melds={state.tableMelds}
          playerNames={state.players.map(p => p.name)}
          canAddTo={isMyTurn && state.phase === 'action' && state.selectedCardIds.length > 0}
          onMeldClick={id => makeMove({ type: 'ADD_TO_MELD', meldId: id })}
        />
        <DiscardPile
          topCard={topDiscard}
          deckCount={state.deck.length}
          canDraw={!!isMyTurn && state.phase === 'draw'}
          onDrawFromDeck={() => makeMove({ type: 'DRAW_FROM_DECK' })}
          onDrawFromDiscard={() => makeMove({ type: 'TAKE_DISCARD' })}
        />
        {!isMyTurn && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            รอ {state.players[state.currentPlayerIndex]?.name}…
          </p>
        )}
      </div>

      {isMyTurn && state.phase === 'action' && (
        <div className="flex gap-2 justify-center px-4 pb-2 flex-wrap">
          {state.phase === 'action' && myPlayerIndex >= 0 &&
            state.players[myPlayerIndex]?.hand.length === 1 && (
            <button onClick={() => makeMove({ type: 'KNOCK' })}
              className="px-6 py-2 rounded-xl text-sm font-bold animate-pulse"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#D4AF37)', color: '#000' }}>
              🃏 น็อค!
            </button>
          )}
          <button onClick={() => makeMove({ type: 'LAY_MELD' })} disabled={state.selectedCardIds.length < 3}
            className="btn-gold px-5 py-2 text-sm disabled:opacity-30">ลงไพ่ ({state.selectedCardIds.length})</button>
          {state.phase === 'action' && (
            <button onClick={() => makeMove({ type: 'DISCARD' })} disabled={state.selectedCardIds.length !== 1}
              className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-30"
              style={{ background: state.selectedCardIds.length === 1 ? '#dc2626' : '#555', color: 'white' }}>ทิ้ง</button>
          )}
          {state.selectedCardIds.length > 0 && (
            <button onClick={() => makeMove({ type: 'CLEAR_SELECTION' })}
              className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>ยกเลิก</button>
          )}
        </div>
      )}

      {myPlayerIndex >= 0 && (
        <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Hand
            cards={state.players[myPlayerIndex]?.hand ?? []}
            selectedIds={isMyTurn ? state.selectedCardIds : []}
            isCurrentPlayer={!!isMyTurn && state.phase === 'action'}
            onCardClick={cardId => makeMove({ type: 'TOGGLE_CARD', cardId })}
            label={`${state.players[myPlayerIndex]?.name ?? 'คุณ'} (${state.players[myPlayerIndex]?.hand.length ?? 0} ใบ)`}
          />
        </div>
      )}

      <div className="px-4 pb-2 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {state.log[state.log.length - 1]}
      </div>
    </main>
    </>
  )
}
