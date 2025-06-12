import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      include: {
        players: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })
    // Add totalTurns to each game
    const gamesWithTurns = games.map(game => ({
      ...game,
      totalTurns: (game.currentMonth - 1) * 28 + (game.currentDay - 1)
    }))
    return NextResponse.json(gamesWithTurns)
  } catch (error) {
    console.error('Error fetching recent games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent games' },
      { status: 500 }
    )
  }
} 