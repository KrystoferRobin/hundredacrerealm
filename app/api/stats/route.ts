import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Debug: print __dirname, process.cwd(), and contents of public/stats
    const debugInfo: any = {
      __dirname,
      cwd: process.cwd(),
      statsDirLocal: path.join(process.cwd(), 'public', 'stats'),
      statsDirDocker: '/app/public/stats',
      statsDirLocalExists: false,
      statsDirDockerExists: false,
      statsDirLocalFiles: [],
      statsDirDockerFiles: []
    };
    try {
      debugInfo.statsDirLocalExists = fs.existsSync(debugInfo.statsDirLocal);
      if (debugInfo.statsDirLocalExists) {
        debugInfo.statsDirLocalFiles = fs.readdirSync(debugInfo.statsDirLocal);
      }
    } catch {}
    try {
      debugInfo.statsDirDockerExists = fs.existsSync(debugInfo.statsDirDocker);
      if (debugInfo.statsDirDockerExists) {
        debugInfo.statsDirDockerFiles = fs.readdirSync(debugInfo.statsDirDocker);
      }
    } catch {}

    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'stats', 'master_stats.json'),
      '/app/public/stats/master_stats.json'
    ];
    const statsFile = possiblePaths.find(p => fs.existsSync(p));

    if (!statsFile) {
      return NextResponse.json(
        { error: 'Master stats not found. Run the stats builder first.', debugInfo },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    // Use the pre-calculated header stats from the stats file
    const headerStats = stats.headerStats || {
      totalGold: 0,
      totalGreatTreasures: 0,
      totalMonstersKilled: 0,
      totalCharactersKilled: 0
    };

    // Get existing stats
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