'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline'

interface Game {
  id: string
  name: string
  createdAt: string
  players: {
    name: string
    character: string
  }[]
}

export default function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games')
        if (!response.ok) {
          throw new Error('Failed to fetch games')
        }
        const data = await response.json()
        setGames(data)
      } catch (err) {
        setError('Failed to load games. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-realm-primary mx-auto"></div>
        <p className="mt-2">Loading games...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No games uploaded yet. Upload your first game above!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <Link
          key={game.id}
          href={`/games/${game.id}`}
          className="card hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-medieval mb-2">{game.name}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>{new Date(game.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              <span>{game.players.length} Players</span>
            </div>
            <div className="mt-2">
              {game.players.map((player, index) => (
                <div key={index} className="text-sm">
                  {player.name} ({player.character})
                </div>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
} 