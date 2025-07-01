import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const statsPath = path.join(process.cwd(), 'parsed_sessions', sessionId, 'character_stats.json');
    
    if (!fs.existsSync(statsPath)) {
      return NextResponse.json(
        { error: 'Character stats not found' },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsPath, 'utf8');
    const stats = JSON.parse(statsData);
    
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error reading character stats:', error);
    return NextResponse.json(
      { error: 'Failed to load character stats' },
      { status: 500 }
    );
  }
} 