import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const inventoryPath = path.join(process.cwd(), 'parsed_sessions', sessionId, 'character_inventories.json');
    
    if (!fs.existsSync(inventoryPath)) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }
    
    const inventoryData = fs.readFileSync(inventoryPath, 'utf8');
    const inventory = JSON.parse(inventoryData);
    
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error loading character inventory:', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
} 