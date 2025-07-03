import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; day: string } }
) {
  try {
    const { id, day } = params;
    
    // Find the session directory
    const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
    const sessionDir = path.join(sessionsDir, id);
    
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Load the map state data
    const mapStatePath = path.join(sessionDir, 'map_state_data.json');
    if (!fs.existsSync(mapStatePath)) {
      return NextResponse.json({ error: 'Map state data not found' }, { status: 404 });
    }
    
    const mapStateData = JSON.parse(fs.readFileSync(mapStatePath, 'utf8'));
    
    // Get the map state for the specific day
    const dayMapState = mapStateData.mapStates[day];
    if (!dayMapState) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }
    
    // Load the parsed session data to get battle information
    const parsedSessionPath = path.join(sessionDir, 'parsed_session.json');
    let battles = [];
    if (fs.existsSync(parsedSessionPath)) {
      const parsedSession = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
      const dayData = parsedSession.days[day];
      if (dayData && dayData.battles) {
        // Filter out battles that only have "end" actions (no real combat)
        battles = dayData.battles.filter((battle: any) => {
          // Check if this battle has any real combat actions
          return battle.rounds && battle.rounds.some((round: any) => {
            return round.actions && round.actions.length > 0;
          });
        });
      }
    }
    
    // Extract character positions for this day
    const characterPositions: { [key: string]: any } = {};
    Object.entries(mapStateData.characterPositions).forEach(([character, positions]) => {
      const dayPosition = (positions as any[]).find((pos: any) => pos.day === day);
      if (dayPosition) {
        characterPositions[character] = {
          endLocation: dayPosition.endLocation,
          startLocation: dayPosition.startLocation
        };
      }
    });
    
    // Create the response
    const response = {
      day: day,
      tiles: dayMapState.tiles,
      characterPositions: characterPositions,
      battles: battles,
      enchantmentEvents: mapStateData.enchantmentEvents.filter((event: any) => event.day === day)
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting map state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 