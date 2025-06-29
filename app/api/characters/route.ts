import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Character {
  id: string;
  name: string;
  source: 'xml' | 'rschar';
  ids: string[];
  folderName: string;
}

export async function GET() {
  try {
    const charactersDir = path.join(process.cwd(), 'coregamedata', 'characters');
    
    if (!fs.existsSync(charactersDir)) {
      return NextResponse.json({ characters: [] });
    }

    // Get only the actual character folders (directories)
    const characterFolders = fs.readdirSync(charactersDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const characters: Character[] = [];

    for (const folderName of characterFolders) {
      const characterDir = path.join(charactersDir, folderName);
      const files = fs.readdirSync(characterDir);
      
      // Look for the main character file that matches the folder name exactly
      const mainCharacterFile = `${folderName}.json`;
      
      if (files.includes(mainCharacterFile)) {
        const characterPath = path.join(characterDir, mainCharacterFile);
        const characterData = JSON.parse(fs.readFileSync(characterPath, 'utf8'));
        
        // Only add if this has a proper name (not just a folder name)
        if (characterData.name) {
          characters.push({
            id: characterData.ids && characterData.ids.length > 0 ? characterData.ids[0] : characterData.id || folderName,
            name: characterData.name,
            source: characterData.source || 'xml',
            ids: characterData.ids || [characterData.id || folderName],
            folderName: folderName
          });
        }
      }
    }

    // Sort characters alphabetically by name
    characters.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      characters,
      total: characters.length 
    });

  } catch (error) {
    console.error('Error reading characters:', error);
    return NextResponse.json(
      { error: 'Failed to load characters' },
      { status: 500 }
    );
  }
} 