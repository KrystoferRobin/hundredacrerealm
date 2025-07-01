import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const inventoriesPath = path.join(process.cwd(), 'parsed_sessions', sessionId, 'character_inventories.json');
    
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