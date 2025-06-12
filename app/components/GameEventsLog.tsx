'use client'

import React from 'react'
import Link from 'next/link'
import ItemPopover from './ItemPopover'

interface GameEvent {
  id: string
  type: string
  description: string
  day: number
  month: number
  playerId?: string
  player?: {
    name: string
    character: string
  }
}

interface BattleEvent {
  time: string
  location: string
  combatants: {
    group1: string[]
    group2: string[]
  }
  rounds: {
    number: number
    events: string[]
  }[]
}

interface GameEventsLogProps {
  events: GameEvent[]
}

function parseBattleEvent(description: string): BattleEvent | null {
  const lines = description.split('\n').map(line => line.trim())
  if (!lines[0]?.includes('Battle resolving at')) return null

  const battle: BattleEvent = {
    time: '',
    location: '',
    combatants: {
      group1: [],
      group2: []
    },
    rounds: []
  }

  let currentRound: { number: number; events: string[] } | null = null
  let currentGroup: 'group1' | 'group2' | null = null

  for (const line of lines) {
    if (line.includes('Battle resolving at')) {
      const [time, location] = line.split(' at ')
      battle.time = time.replace('RealmBattle - ', '').trim()
      battle.location = location.replace(':', '').trim()
    } else if (line.includes('GROUP 1')) {
      currentGroup = 'group1'
    } else if (line.includes('GROUP 2')) {
      currentGroup = 'group2'
    } else if (line.includes('Combat Round')) {
      if (currentRound) {
        battle.rounds.push(currentRound)
      }
      const roundNum = parseInt(line.match(/Round (\d+)/)?.[1] || '0')
      currentRound = { number: roundNum, events: [] }
    } else if (currentGroup && line && !line.includes('=======================')) {
      const combatant = line.replace('RealmBattle - ', '').trim()
      if (combatant && !combatant.includes('GROUP')) {
        battle.combatants[currentGroup].push(combatant)
      }
    } else if (currentRound && line && !line.includes('=======================')) {
      if (line.includes(' - - - - -')) return null // Skip phase markers
      const event = line.replace('RealmBattle - ', '').trim()
      if (event && !event.includes('Combat Round')) {
        currentRound.events.push(event)
      }
    }
  }

  if (currentRound) {
    battle.rounds.push(currentRound)
  }

  return battle
}

function BattleEvent({ event }: { event: GameEvent }) {
  const battle = parseBattleEvent(event.description)
  if (!battle) return null

  return (
    <div className="card p-4 bg-white/90 border-2 border-red-800">
      <div className="text-sm text-gray-600 mb-2">
        Day {event.day}, Month {event.month}
      </div>
      <div className="mb-4">
        <div className="text-lg font-bold text-red-800 mb-2">
          {battle.time} at {battle.location}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="font-semibold text-purple-700">Group 1</div>
            {battle.combatants.group1.map((combatant, idx) => (
              <div key={idx} className="ml-2">{combatant}</div>
            ))}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-purple-700">Group 2</div>
            {battle.combatants.group2.map((combatant, idx) => (
              <div key={idx} className="ml-2">{combatant}</div>
            ))}
          </div>
        </div>
      </div>
      {battle.rounds.map((round) => (
        <div key={round.number} className="mb-4">
          <div className="font-semibold text-red-800 mb-2">
            Combat Round {round.number}
          </div>
          <div className="ml-4 space-y-1">
            {round.events.map((event, idx) => {
              // Highlight important events
              const isKill = event.includes('was killed')
              const isWound = event.includes('takes') && event.includes('wound')
              const isFatigue = event.includes('Fatiguing')
              const isDisengage = event.includes('disengages')
              
              return (
                <div 
                  key={idx} 
                  className={`text-sm ${
                    isKill ? 'text-red-600 font-semibold' :
                    isWound ? 'text-orange-600' :
                    isFatigue ? 'text-blue-600' :
                    isDisengage ? 'text-green-600' :
                    'text-gray-700'
                  }`}
                >
                  {event}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GameEventsLog({ events }: GameEventsLogProps) {
  console.log('GameEventsLog received events:', events.length)
  console.log('Battle events:', events.filter(e => e.type === 'BATTLE').length)

  const processDescription = (description: string) => {
    // Split the description into words
    const words = description.split(/(\s+)/)
    
    return words.map((word, index) => {
      // Check if the word is an item (starts with a capital letter and is not a common word)
      if (/^[A-Z][a-z]+$/.test(word)) {
        return (
          <ItemPopover key={index} itemName={word}>
            <span className="text-blue-600 hover:text-blue-800 cursor-help">{word}</span>
          </ItemPopover>
        )
      }
      
      // Check if the word is a character name (starts with a capital letter and is longer)
      if (/^[A-Z][a-z]+$/.test(word)) {
        return (
          <Link 
            key={index} 
            href={`/characters/${word.toLowerCase()}`}
            className="text-purple-600 hover:text-purple-800"
          >
            {word}
          </Link>
        )
      }
      
      // Check if the word is a native group (starts with a capital letter and contains "Natives")
      if (/^[A-Z][a-z]+ Natives$/.test(word)) {
        const groupName = word.replace(' Natives', '')
        return (
          <Link 
            key={index} 
            href={`/natives/${groupName.toLowerCase()}`}
            className="text-green-600 hover:text-green-800"
          >
            {word}
          </Link>
        )
      }
      
      // Return the word as is if it doesn't match any patterns
      return word
    })
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        console.log('Processing event:', event.type, event.description.substring(0, 50) + '...')
        return event.type === 'BATTLE' ? (
          <BattleEvent key={event.id} event={event} />
        ) : (
          <div key={event.id} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">
                Day {event.day}, Month {event.month}
              </div>
              {event.player && (
                <Link 
                  href={`/characters/${event.player.character.toLowerCase()}`}
                  className="text-purple-600 hover:text-purple-800"
                >
                  {event.player.character} ({event.player.name})
                </Link>
              )}
            </div>
            <div className="text-gray-800">
              {processDescription(event.description)}
            </div>
          </div>
        )
      })}
    </div>
  )
} 