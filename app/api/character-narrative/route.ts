import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the character data from the parsed JSON file
    const dataPath = path.join(process.cwd(), 'parsed_sessions/learning-woodsgirl/decoded_character_data_correct.json');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Character data not found' }, { status: 404 });
    }
    
    const characterData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    return NextResponse.json(characterData);
  } catch (error) {
    console.error('Error loading character data:', error);
    return NextResponse.json({ error: 'Failed to load character data' }, { status: 500 });
  }
} 