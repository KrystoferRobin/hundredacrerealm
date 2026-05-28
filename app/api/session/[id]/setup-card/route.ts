import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const sessionDir = path.join(SESSIONS_DIR, sessionId);

  if (!fs.existsSync(sessionDir)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const setupCardPath = path.join(sessionDir, 'setup_card.json');
  const gameStatePath = path.join(sessionDir, 'game_state.json');

  if (fs.existsSync(setupCardPath)) {
    const data = JSON.parse(fs.readFileSync(setupCardPath, 'utf8'));
    return NextResponse.json({ source: 'setup_card.json', data });
  }

  if (fs.existsSync(gameStatePath)) {
    const gameState = JSON.parse(fs.readFileSync(gameStatePath, 'utf8'));
    if (gameState.setupCard) {
      return NextResponse.json({ source: 'game_state.json', data: gameState.setupCard });
    }
  }

  return NextResponse.json(
    { error: 'Setup card data not available for this session' },
    { status: 404 }
  );
}
