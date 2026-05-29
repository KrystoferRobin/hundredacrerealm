import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  findMonsterByName,
  findNativeByName,
} from '@/lib/coregamedata-lookup';

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

    const coreDataDir = path.join(process.cwd(), 'coregamedata');
    
    if (!fs.existsSync(coreDataDir)) {
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

function itemJsonToRecord(
  itemData: { id?: string; name: string; description?: string; image?: string; attributeBlocks?: any; parts?: any[] },
  category: string,
  filename: string
) {
  return {
    id: itemData.id || filename.replace('.json', ''),
    name: itemData.name,
    type: category,
    description: itemData.description,
    image: itemData.image,
    attributeBlocks: itemData.attributeBlocks || {},
    parts: itemData.parts || [],
  };
}

async function findItemsInCategory(
  name: string,
  category: string,
  coreDataDir: string
): Promise<any[]> {
  const itemsDir = path.join(coreDataDir, 'items', category);
  if (!fs.existsSync(itemsDir)) return [];

  const files = fs.readdirSync(itemsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.json'))
    .map((dirent) => dirent.name);

  const matches: any[] = [];
  for (const filename of files) {
    try {
      const filePath = path.join(itemsDir, filename);
      const itemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (itemData.name === name) {
        matches.push(itemJsonToRecord(itemData, category, filename));
      }
    } catch (error) {
      console.error(`Error reading item file ${filename}:`, error);
    }
  }
  return matches;
}

function pickPreferredItemRecord(matches: Array<{ id: string; name: string; type: string; attributeBlocks: any; parts: any[] }>) {
  if (matches.length === 0) return null;
  return matches.sort((a, b) => {
    const aParts = a.parts?.length ?? 0;
    const bParts = b.parts?.length ?? 0;
    if (bParts !== aParts) return bParts - aParts;
    return Number(b.id) - Number(a.id);
  })[0];
}

async function findItem(name: string, category: string, coreDataDir: string): Promise<any> {
  const matches: Array<{
    id: string;
    name: string;
    type: string;
    attributeBlocks: any;
    parts: any[];
  }> = [];

  for (const cat of ['armor', 'weapon', 'treasure']) {
    const found = await findItemsInCategory(name, cat, coreDataDir);
    matches.push(...found);
  }

  return pickPreferredItemRecord(matches);
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
  return findMonsterByName(name, coreDataDir);
}

async function findNative(name: string, coreDataDir: string): Promise<any> {
  return findNativeByName(name, coreDataDir);
} 