'use client'

import { useEffect, useState } from 'react'
import GameEventsLog from '../../components/GameEventsLog'

interface Player {
  id: string
  name: string
  character: string
  characterType: string
  location?: string
}

interface GameEvent {
  id: string
  type: string
  description: string
  day: number
  month: number
  playerId?: string
  player?: Player
}

interface Game {
  id: string
  name: string
  currentDay: number
  currentMonth: number
  mapImage?: string
  players: Player[]
  events: GameEvent[]
  gameLogs: {
    id: string
    filename: string
    logType: string
    data: string
  }[]
}

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch game')
        }
        const data = await response.json()
        setGame(data)
      } catch (err) {
        setError('Failed to load game. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchGame()
  }, [params.id])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-realm-primary mx-auto"></div>
        <p className="mt-2">Loading game...</p>
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

  if (!game) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Game not found.</p>
      </div>
    )
  }

  const totalTurns = (game.currentMonth - 1) * 28 + (game.currentDay - 1)
  const gameLog = game.gameLogs.find(log => log.logType === 'log')
  const logData = gameLog ? JSON.parse(gameLog.data) : null

  return (
    <div className="flex flex-row bg-parchment text-[#171717] min-h-[80vh] rounded shadow">
      {/* Left: Characters */}
      <aside className="w-1/4 min-w-[220px] max-w-xs p-4 border-r border-brown flex flex-col gap-4 bg-parchment">
        <h2 className="text-lg font-serif font-bold mb-2">Characters</h2>
        {game.players.map(player => (
          <div key={player.id} className="flex flex-row items-center gap-3 mb-4 p-2 bg-white/80 rounded shadow">
            {/* Portrait placeholder */}
            <div className="w-12 h-12 bg-gray-300 border-2 border-brown rounded mr-2 flex-shrink-0 flex items-center justify-center">
              {/* Portrait will go here */}
            </div>
            <div className="flex-1">
              <div className="font-bold text-md">{player.character} <span className="text-gray-600">({player.name || player.id})</span></div>
              <div className="text-xs mt-1">
                Notoriety: <span className="font-semibold">—</span><br />
                Fame: <span className="font-semibold">—</span><br />
                Gold: <span className="font-semibold">—</span>
              </div>
            </div>
          </div>
        ))}
      </aside>

      {/* Right: Map and Game Info */}
      <main className="w-3/4 p-6 flex flex-col gap-6">
        <div className="flex flex-row items-start gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold mb-2">{game.name}</h1>
            <div className="mb-2 text-sm text-gray-700">Total Turns: <span className="font-bold">{totalTurns}</span></div>
          </div>
          <div className="w-128 h-128 bg-gray-200 border-2 border-brown rounded flex items-center justify-center overflow-hidden">
            {game.mapImage ? (
              <img src={game.mapImage} alt="Game Map" className="object-contain w-full h-full" />
            ) : (
              <span className="text-gray-500">Map Placeholder</span>
            )}
          </div>
        </div>

        {/* Game Events */}
        <div>
          <h2 className="text-lg font-serif font-semibold mb-4">Game Events</h2>
          <GameEventsLog events={game.events} />
        </div>

        {/* Original Game Log */}
        {logData && (
          <div>
            <h2 className="text-lg font-serif font-semibold mb-4">Game Log</h2>
            <div className="prose max-w-none bg-white/80 rounded p-4 shadow overflow-x-auto">
              {(() => {
                const logText = logData.text || '';
                const lines = logText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const output: React.ReactNode[] = [];
                let currentDay = '';
                let monsterDie = '';
                let charTurn: { name: string, start: string, actions: string[], end: string, reveals: string[] } | null = null;

                const flushCharTurn = () => {
                  if (charTurn) {
                    output.push(
                      <div key={output.length} className="mb-2">
                        <strong>{charTurn.name}</strong> - {charTurn.start}
                        {charTurn.actions.length > 0 && ` - ${charTurn.actions.join(', ')}`}
                        {charTurn.end && `, ${charTurn.end}`}
                        {charTurn.reveals.length > 0 && `. Reveals ${charTurn.reveals.join(', ')}`}
                      </div>
                    );
                    charTurn = null;
                  }
                };

                for (let i = 0; i < lines.length; ++i) {
                  const line = lines[i];
                  if (line.startsWith('RealmSpeak -')) {
                    if (line.includes('Month') && line.includes('Day')) {
                      flushCharTurn();
                      currentDay = line.replace('RealmSpeak -', '').replace(/=+/g, '').trim();
                    } else if (line.includes('Monster Die roll')) {
                      monsterDie = line.match(/Rolled (\d)/)?.[1] || '';
                      output.push(
                        <div key={output.length} className="font-bold mt-4 mb-2">
                          {currentDay}{monsterDie ? `. Monster Die ${monsterDie}.` : ''}
                        </div>
                      );
                      currentDay = '';
                      monsterDie = '';
                    }
                    continue;
                  }
                  // Character turn grouping
                  const charStart = line.match(/^(.*?) - Starts turn: (.*)$/);
                  const charEnd = line.match(/^(.*?) - Ends turn: (.*)$/);
                  const charAction = line.match(/^(.*?) - (Move|Hide|Rest|Alert|Search|Trade|Buy|Sell|Enchant|Spell|Combat|Loot|Other) ?-? ?(.*)?$/);
                  const charReveal = line.match(/^(.*?) - Reveals: (.*)$/);
                  if (charStart) {
                    flushCharTurn();
                    charTurn = {
                      name: charStart[1],
                      start: `Starts turn: ${charStart[2]}`,
                      actions: [],
                      end: '',
                      reveals: []
                    };
                    continue;
                  }
                  if (charEnd && charTurn && charTurn.name === charEnd[1]) {
                    charTurn.end = `Ends turn: ${charEnd[2]}`;
                    continue;
                  }
                  if (charAction && charTurn && charTurn.name === charAction[1]) {
                    charTurn.actions.push(`${charAction[2]}${charAction[3] ? ' - ' + charAction[3] : ''}`);
                    continue;
                  }
                  if (charReveal && charTurn && charTurn.name === charReveal[1]) {
                    charTurn.reveals.push(charReveal[2]);
                    continue;
                  }
                  // If not matched, flush any open char turn
                  flushCharTurn();
                  // Otherwise, just output the line as is
                  output.push(
                    <div key={output.length} className="mb-2 whitespace-pre-line">{line}</div>
                  );
                }
                flushCharTurn();
                return output;
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
