import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

interface TooltipRequest {
  type: 'item' | 'spell' | 'character' | 'monster' | 'native';
  name: string;
  category?: string; // For items: 'armor', 'treasure', 'weapon'
  level?: string; // For spells: 'I', 'II', etc.
}

export async function POST(request: Request) {
  try {
    const body: TooltipRequest = await request.json();
    const { type, name, category, level } = body;

    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'coregamedata'),
      '/app/coregamedata'
    ];
    const coreDataDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!coreDataDir) {
      return NextResponse.json({ error: 'Core game data not found' }, { status: 404 });
    }

    let data: any = null;

    switch (type) {
      case 'item':
        if (!category) {
          return NextResponse.json({ error: 'Category required for items' }, { status: 400 });
        }
        data = await findItem(name, category, coreDataDir);
        break;
      
      case 'spell':
        if (!level) {
          return NextResponse.json({ error: 'Level required for spells' }, { status: 400 });
        }
        data = await findSpell(name, level, coreDataDir);
        break;
      
      case 'character':
        data = await findCharacter(name, coreDataDir);
        break;
      
      case 'monster':
        data = await findMonster(name, coreDataDir);
        break;
      
      case 'native':
        data = await findNative(name, coreDataDir);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in tooltip API:', error);
    return NextResponse.json({ error: 'Failed to load tooltip data' }, { status: 500 });
  }
}

async function findItem(name: string, category: string, coreDataDir: string): Promise<any> {
  const itemsDir = path.join(coreDataDir, 'items', category);
  if (!fs.existsSync(itemsDir)) return null;

  const files = fs.readdirSync(itemsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);

  for (const filename of files) {
    try {
      const filePath = path.join(itemsDir, filename);
      const itemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (itemData.name === name) {
        return {
          id: itemData.id || filename.replace('.json', ''),
          name: itemData.name,
          type: category,
          description: itemData.description,
          image: itemData.image,
          attributeBlocks: itemData.attributeBlocks || {}
        };
      }
    } catch (error) {
      console.error(`Error reading item file ${filename}:`, error);
    }
  }
  return null;
}

async function findSpell(name: string, level: string, coreDataDir: string): Promise<any> {
  const spellsDir = path.join(coreDataDir, 'spells', level);
  if (!fs.existsSync(spellsDir)) return null;

  const files = fs.readdirSync(spellsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);

  for (const filename of files) {
    try {
      const filePath = path.join(spellsDir, filename);
      const spellData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (spellData.name === name) {
        return {
          id: spellData.id || filename.replace('.json', ''),
          name: spellData.name,
          level,
          description: spellData.description,
          image: spellData.image,
          attributeBlocks: spellData.attributeBlocks || {}
        };
      }
    } catch (error) {
      console.error(`Error reading spell file ${filename}:`, error);
    }
  }
  return null;
}

async function findCharacter(name: string, coreDataDir: string): Promise<any> {
  const charactersDir = path.join(coreDataDir, 'characters');
  if (!fs.existsSync(charactersDir)) return null;

  const files = fs.readdirSync(charactersDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of files) {
    const charPath = path.join(charactersDir, folder, `${folder}.json`);
    if (fs.existsSync(charPath)) {
      try {
        const charData = JSON.parse(fs.readFileSync(charPath, 'utf8'));
        
        if (charData.name === name) {
          return {
            id: charData.id || folder,
            name: charData.name,
            attributeBlocks: charData.attributeBlocks || {}
          };
        }
      } catch (error) {
        console.error(`Error reading character file ${charPath}:`, error);
      }
    }
  }
  return null;
}

async function findMonster(name: string, coreDataDir: string): Promise<any> {
  const monstersDir = path.join(coreDataDir, 'monsters');
  if (!fs.existsSync(monstersDir)) return null;

  const files = fs.readdirSync(monstersDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);

  for (const filename of files) {
    try {
      const filePath = path.join(monstersDir, filename);
      const monsterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (monsterData.name === name) {
        return {
          id: monsterData.id || filename.replace('.json', ''),
          name: monsterData.name,
          attributeBlocks: monsterData.attributeBlocks || {}
        };
      }
    } catch (error) {
      console.error(`Error reading monster file ${filename}:`, error);
    }
  }
  return null;
}

async function findNative(name: string, coreDataDir: string): Promise<any> {
  const nativesDir = path.join(coreDataDir, 'natives');
  if (!fs.existsSync(nativesDir)) return null;

  const files = fs.readdirSync(nativesDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
    .map(dirent => dirent.name);

  for (const filename of files) {
    try {
      const filePath = path.join(nativesDir, filename);
      const nativeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (nativeData.name === name) {
        return {
          id: nativeData.id || filename.replace('.json', ''),
          name: nativeData.name,
          attributeBlocks: nativeData.attributeBlocks || {}
        };
      }
    } catch (error) {
      console.error(`Error reading native file ${filename}:`, error);
    }
  }
  return null;
} 