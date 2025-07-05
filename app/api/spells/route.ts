import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Spell {
  id: string;
  name: string;
  level: string;
  description?: string;
  image?: string;
  attributeBlocks: Record<string, any>;
}

interface SpellGroup {
  level: string;
  displayName: string;
  spells: Spell[];
}

export async function GET() {
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'coregamedata', 'spells'),
      '/app/coregamedata/spells'
    ];
    const spellsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!spellsDir) {
      return NextResponse.json({ spellGroups: [] });
    }

    const spellGroups: SpellGroup[] = [];
    const levelOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'special'];

    for (const level of levelOrder) {
      const levelPath = path.join(spellsDir, level);
      
      if (!fs.existsSync(levelPath)) {
        continue;
      }

      const spells: Spell[] = [];
      const seenNames = new Set<string>();

      const files = fs.readdirSync(levelPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => dirent.name);

      for (const filename of files) {
        try {
          const filePath = path.join(levelPath, filename);
          const spellData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Only include the first spell if there are duplicates with the same name
          if (!seenNames.has(spellData.name)) {
            seenNames.add(spellData.name);
            
            spells.push({
              id: spellData.id || filename.replace('.json', ''),
              name: spellData.name,
              level,
              description: spellData.description,
              image: spellData.image,
              attributeBlocks: spellData.attributeBlocks || {}
            });
          }
        } catch (error) {
          console.error(`Error reading spell file ${filename}:`, error);
        }
      }

      // Sort spells alphabetically
      spells.sort((a, b) => a.name.localeCompare(b.name));

      if (spells.length > 0) {
        const displayNames = {
          'I': 'Level I Spells',
          'II': 'Level II Spells',
          'III': 'Level III Spells',
          'IV': 'Level IV Spells',
          'V': 'Level V Spells',
          'VI': 'Level VI Spells',
          'VII': 'Level VII Spells',
          'VIII': 'Level VIII Spells',
          'special': 'Special Spells'
        };

        spellGroups.push({
          level,
          displayName: displayNames[level as keyof typeof displayNames] || `Level ${level} Spells`,
          spells
        });
      }
    }

    return NextResponse.json({ spellGroups });
  } catch (error) {
    console.error('Error reading spells:', error);
    return NextResponse.json({ error: 'Failed to load spells' }, { status: 500 });
  }
} 