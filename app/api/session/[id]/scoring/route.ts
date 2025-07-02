import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const sessionId = params.id;
        const scoringPath = path.join('/app/public/parsed_sessions', sessionId, 'scoring.json');
        
        if (!fs.existsSync(scoringPath)) {
            return NextResponse.json({ error: 'Scoring data not found' }, { status: 404 });
        }
        
        const scoringData = JSON.parse(fs.readFileSync(scoringPath, 'utf8'));
        
        return NextResponse.json(scoringData);
    } catch (error) {
        console.error('Error loading scoring data:', error);
        return NextResponse.json({ error: 'Failed to load scoring data' }, { status: 500 });
    }
} 