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
    
    const mapLocationsPath = path.join(sessionsDir, sessionId, 'map_locations.json');
    
    if (!fs.existsSync(mapLocationsPath)) {
      return NextResponse.json(
        { error: 'Map locations not found for this session' },
        { status: 404 }
      );
    }

    const mapLocations = JSON.parse(fs.readFileSync(mapLocationsPath, 'utf8'));
    
    return NextResponse.json(mapLocations);
  } catch (error) {
    console.error('Error loading map locations:', error);
    return NextResponse.json(
      { error: 'Failed to load map locations' },
      { status: 500 }
    );
  }
} 