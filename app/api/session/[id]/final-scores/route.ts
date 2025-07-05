import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const sessionId = params.id;
        
        // Try both local and Docker paths
        const possiblePaths = [
            path.join(process.cwd(), 'public', 'parsed_sessions'),
            '/app/public/parsed_sessions'
        ];
        const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
        
        if (!sessionsDir) {
            return NextResponse.json(
                { error: 'Sessions directory not found' },
                { status: 404 }
            );
        }
        
        const scoresPath = path.join(sessionsDir, sessionId, 'final_scores.json');
        
        if (!fs.existsSync(scoresPath)) {
            return NextResponse.json(
                { error: 'Final scores not found' },
                { status: 404 }
            );
        }

        const scoresData = fs.readFileSync(scoresPath, 'utf8');
        const scores = JSON.parse(scoresData);
        
        return NextResponse.json(scores);

    } catch (error) {
        console.error('Error reading final scores:', error);
        return NextResponse.json(
            { error: 'Failed to get final scores' },
            { status: 500 }
        );
    }
} 