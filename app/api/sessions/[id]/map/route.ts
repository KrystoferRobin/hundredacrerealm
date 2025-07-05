import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
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
    
    const mapDataPath = path.join(sessionsDir, sessionId, 'map_data.json');
    
    if (!fs.existsSync(mapDataPath)) {
      return NextResponse.json(
        { error: 'Map data not found for this session' },
        { status: 404 }
      );
    }

    const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
    
    return NextResponse.json(mapData);
  } catch (error) {
    console.error('Error loading map data:', error);
    return NextResponse.json(
      { error: 'Failed to load map data' },
      { status: 500 }
    );
  }
} 