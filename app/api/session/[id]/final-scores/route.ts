import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getFinalScores(sessionId: string) {
    const sessionDir = path.join(process.cwd(), 'parsed_sessions', sessionId);
    const finalScoresPath = path.join(sessionDir, 'final_scores.json');
    
    if (!fs.existsSync(finalScoresPath)) {
        throw new Error('Final scores not found. Run the session processing pipeline first.');
    }
    
    const finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
    return finalScores;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const sessionId = params.id;
        const finalScores = getFinalScores(sessionId);
        
        return NextResponse.json(finalScores);
    } catch (error) {
        console.error('Error getting final scores:', error);
        return NextResponse.json({ error: 'Failed to get final scores' }, { status: 500 });
    }
} 