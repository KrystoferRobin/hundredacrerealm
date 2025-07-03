import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const statsFile = path.join(process.cwd(), 'data', 'master_stats.json');
    
    if (!fs.existsSync(statsFile)) {
      return NextResponse.json(
        { error: 'Master stats not found. Run the stats builder first.' },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error reading master stats:', error);
    return NextResponse.json(
      { error: 'Failed to load master statistics' },
      { status: 500 }
    );
  }
} 