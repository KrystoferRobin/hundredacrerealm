import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Find the tile file by name (without extension)
    const tilesDir = path.join(process.cwd(), 'coregamedata', 'tiles');
    const files = fs.readdirSync(tilesDir);
    
    // Look for a file that starts with the tile name
    const tileFile = files.find(file => 
      file.startsWith(filename) && file.endsWith('.json')
    );
    
    if (!tileFile) {
      return NextResponse.json(
        { error: `Tile not found: ${filename}` },
        { status: 404 }
      );
    }
    
    const filePath = path.join(tilesDir, tileFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const tileData = JSON.parse(fileContent);
    
    return NextResponse.json(tileData);
  } catch (error) {
    console.error('Error loading tile data:', error);
    return NextResponse.json(
      { error: 'Failed to load tile data' },
      { status: 500 }
    );
  }
} 