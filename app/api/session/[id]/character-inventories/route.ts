import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!sessionsDir) {
      return NextResponse.json(
        { error: 'Sessions directory not found' },
        { status: 404 }
      );
    }
    
    const inventoriesPath = path.join(sessionsDir, sessionId, 'character_inventories.json');
    
    if (!fs.existsSync(inventoriesPath)) {
      return NextResponse.json(
        { error: 'Character inventories not found' },
        { status: 404 }
      );
    }

    const inventoriesData = fs.readFileSync(inventoriesPath, 'utf8');
    const inventories = JSON.parse(inventoriesData);
    
    return NextResponse.json(inventories);

  } catch (error) {
    console.error('Error reading character inventories:', error);
    return NextResponse.json(
      { error: 'Failed to load character inventories' },
      { status: 500 }
    );
  }
} 