"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Player {
  name: string
  character: string
  victoryPoints: number
}

interface Game {
  id: string
  name: string
  createdAt: string
  currentDay: number
  players: Player[]
}

export default function GameListSidebar() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games')
        if (!response.ok) throw new Error('Failed to fetch games')
        const data = await response.json()
        setGames(data.slice(0, 10))
      } catch (err) {
        setError('Failed to load games.')
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  return (
    <aside className="card bg-[rgba(255,255,240,0.97)] border-2 border-[#d2b48c] shadow-md p-3 h-full">
      <h2 className="text-lg font-medieval mb-2 text-center">Recent Games</h2>
      {loading && <div className="text-center text-gray-500">Loading...</div>}
      {error && <div className="text-red-700 text-center">{error}</div>}
      {!loading && !error && games.length === 0 && (
        <div className="text-center text-gray-500">No games yet.</div>
      )}
      <ul className="space-y-2">
        {games.map((game) => (
          <li key={game.id}>
            <Link href={`/games/${game.id}`} className="block hover:bg-realm-accent/10 rounded p-2 transition">
              <div className="font-semibold font-medieval text-lg mb-1">{game.name}</div>
              <div className="text-xs text-gray-700 mb-1">Total Days: <span className="font-bold">{game.currentDay ?? '?'}</span></div>
              <ul className="text-sm space-y-1">
                {game.players.map((player, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{player.victoryPoints ?? '?'}</span> {player.character} <span className="text-gray-600">({player.name})</span>
                  </li>
                ))}
              </ul>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
} 