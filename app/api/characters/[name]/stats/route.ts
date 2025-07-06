import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const characterName = decodeURIComponent(params.name);
    const statsFile = path.join(process.cwd(), 'public', 'stats', 'master_stats.json');
    
    if (!fs.existsSync(statsFile)) {
      return NextResponse.json(
        { error: 'Master stats not found. Run the stats builder first.' },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    const characterStats = stats.characters[characterName];
    
    if (!characterStats) {
      return NextResponse.json(
        { error: `Character '${characterName}' not found in statistics` },
        { status: 404 }
      );
    }

    // Get top killers and killed for this character
    const topKillers = Object.entries(characterStats.killers || {})
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topKilled = Object.entries(characterStats.killed || {})
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Get character's treasure stats
    const treasureStats = stats.treasures.byCharacter[characterName] || { found: {}, sold: {} };

    // Get character's monster kill stats
    const monsterKills = stats.monsters.killedByCharacter[characterName] || {};

    const response = {
      characterName,
      ...characterStats,
      topKillers,
      topKilled,
      treasureStats,
      monsterKills
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error reading character stats:', error);
    return NextResponse.json(
      { error: 'Failed to load character statistics' },
      { status: 500 }
    );
  }
} 