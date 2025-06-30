import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Serve map data for the requested session
    const mapDataPath = path.join(process.cwd(), `parsed_sessions/${sessionId}/map_data.json`);
    
    if (!fs.existsSync(mapDataPath)) {
      return NextResponse.json({ error: 'Map data not found' }, { status: 404 });
    }
    
    const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
    
    return NextResponse.json(mapData);
  } catch (error) {
    console.error('Error fetching map data:', error);
    return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 500 });
  }
} 