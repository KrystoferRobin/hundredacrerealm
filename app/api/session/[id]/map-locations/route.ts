import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const mapLocationsPath = path.join('/app/public/parsed_sessions', sessionId, 'map_locations.json');
    
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