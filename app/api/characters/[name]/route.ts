import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface CharacterPart {
  id: string;
  name: string;
  content: string;
  attributeBlocks: Record<string, any>;
}

interface Character {
  id: string;
  name: string;
  source: 'xml' | 'rschar';
  ids?: string[];
  parts: CharacterPart[];
  attributeBlocks: Record<string, any>;
}

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const characterName = decodeURIComponent(params.name);
    const charactersDir = path.join(process.cwd(), 'coregamedata', 'characters');
    
    if (!fs.existsSync(charactersDir)) {
      return NextResponse.json(
        { error: 'Characters directory not found' },
        { status: 404 }
      );
    }

    // Find the character folder by name
    const characterFolders = fs.readdirSync(charactersDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let characterFolder: string | null = null;
    for (const folder of characterFolders) {
      const folderPath = path.join(charactersDir, folder);
      const files = fs.readdirSync(folderPath);
      
      // Look for the main character file that matches the folder name exactly
      const mainCharacterFile = `${folder}.json`;
      
      if (files.includes(mainCharacterFile)) {
        const characterPath = path.join(folderPath, mainCharacterFile);
        const characterData = JSON.parse(fs.readFileSync(characterPath, 'utf8'));
        
        if (characterData.name === characterName) {
          characterFolder = folder;
          break;
        }
      }
    }

    if (!characterFolder) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    const characterDir = path.join(charactersDir, characterFolder);
    const files = fs.readdirSync(characterDir);
    
    // Load main character file
    const mainCharacterFile = `${characterFolder}.json`;

    if (!files.includes(mainCharacterFile)) {
      return NextResponse.json(
        { error: 'Character data not found' },
        { status: 404 }
      );
    }

    const characterPath = path.join(characterDir, mainCharacterFile);
    const characterData = JSON.parse(fs.readFileSync(characterPath, 'utf8'));

    // Load character parts from the main character file
    const parts: CharacterPart[] = [];
    const existingIds = new Set<string>();
    
    // Add parts from the main character file (these are the chits)
    if (characterData.parts && Array.isArray(characterData.parts)) {
      characterData.parts.forEach((part: any) => {
        const partId = part.id || '';
        if (!existingIds.has(partId)) {
          existingIds.add(partId);
          parts.push({
            id: partId,
            name: part.name || '',
            content: part.content || '',
            attributeBlocks: part.attributeBlocks || {}
          });
        }
      });
    }

    // Also load any separate part files if they exist
    const partFiles = files.filter(file => 
      file.endsWith('.json') && 
      file !== mainCharacterFile && // Exclude the main character file
      (file.includes('_Fight_') || file.includes('_Move_') || file.includes('_Magic_') || file.includes('_part_') || file.includes('_chit_'))
    );

    for (const partFile of partFiles) {
      const partPath = path.join(characterDir, partFile);
      const partData = JSON.parse(fs.readFileSync(partPath, 'utf8'));
      const partId = partData.id || partFile.replace('.json', '');
      
      if (!existingIds.has(partId)) {
        existingIds.add(partId);
        parts.push({
          id: partId,
          name: partData.name || partFile.replace('.json', '').replace(/_/g, ' '),
          content: partData.content || '',
          attributeBlocks: partData.attributeBlocks || {}
        });
      }
    }

    const character: Character = {
      id: characterData.id || characterFolder,
      name: characterData.name || characterName,
      source: characterData.source || 'xml',
      ids: characterData.ids || [characterData.id],
      parts: parts,
      attributeBlocks: characterData.attributeBlocks || {}
    };

    return NextResponse.json({ character });

  } catch (error) {
    console.error('Error reading character:', error);
    return NextResponse.json(
      { error: 'Failed to load character' },
      { status: 500 }
    );
  }
} 