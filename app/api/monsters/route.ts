import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MonsterPart {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      monster: string;
      part: string;
    };
    light: {
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
    dark: {
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
  };
}

interface Monster {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      monster: string;
      vulnerability: string;
      fame: string;
      notoriety: string;
      base_price: string;
      armored?: string;
      box_num?: string;
    };
    light: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
    dark: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
  };
  parts?: MonsterPart[];
}

interface MonsterGroup {
  name: string;
  count: number;
  monsters: Monster[];
}

export async function GET() {
  try {
    const monstersDir = path.join(process.cwd(), 'coregamedata', 'monsters');
    
    if (!fs.existsSync(monstersDir)) {
      return NextResponse.json(
        { error: 'Monsters directory not found' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(monstersDir);
    const allMonsters: Monster[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(monstersDir, file);
        const monsterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        allMonsters.push(monsterData);
      }
    }

    // Group monsters by name
    const monsterGroups: { [key: string]: Monster[] } = {};
    
    for (const monster of allMonsters) {
      const name = monster.name;
      if (!monsterGroups[name]) {
        monsterGroups[name] = [];
      }
      monsterGroups[name].push(monster);
    }

    // Convert to array and sort
    const groups: MonsterGroup[] = Object.entries(monsterGroups).map(([name, monsters]) => ({
      name,
      count: monsters.length,
      monsters: monsters.sort((a, b) => a.id.localeCompare(b.id))
    }));

    // Sort groups alphabetically by name
    groups.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ monsterGroups: groups });

  } catch (error) {
    console.error('Error reading monsters:', error);
    return NextResponse.json(
      { error: 'Failed to load monsters' },
      { status: 500 }
    );
  }
} 