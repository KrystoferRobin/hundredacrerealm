import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const statsFile = path.join(process.cwd(), 'public', 'stats', 'master_stats.json');

    if (!fs.existsSync(statsFile)) {
      return NextResponse.json(
        { error: 'Master stats not found. Run the stats builder first.' },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    const headerStats = stats.headerStats || {
      totalGold: 0,
      totalGreatTreasures: 0,
      totalMonstersKilled: 0,
      totalCharactersKilled: 0
    };

    const topStats = stats.topStats || {};
    const characters = stats.characters || {};
    const treasures = stats.treasures || {};
    const monsters = stats.monsters || {};

    return NextResponse.json({
      headerStats,
      topStats,
      characters,
      treasures,
      monsters
    });
  } catch (error) {
    console.error('Error reading stats:', error);
    return NextResponse.json(
      { error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}
