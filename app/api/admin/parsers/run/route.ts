import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { spawn } from 'child_process';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to check authentication
async function checkAuth(request: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token');

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token.value, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

const parsers = {
  build_master_stats: 'scripts/build_master_stats.js',
  generate_session_titles: 'scripts/generate_session_titles.js',
  process_all_sessions: 'scripts/process_all_sessions.js',
  reprocess_existing_sessions: 'scripts/reprocess_existing_sessions.js',
  add_scoring_to_all_sessions: 'scripts/add_scoring_to_all_sessions.js',
  extract_missing_data: 'scripts/extract_missing_data.js'
};

export async function POST(request: NextRequest): Promise<Response> {
  const user = await checkAuth(request);
  
  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { parserId } = await request.json();

    if (!parserId || !parsers[parserId as keyof typeof parsers]) {
      return NextResponse.json(
        { error: 'Invalid parser ID' },
        { status: 400 }
      );
    }

    const scriptPath = parsers[parserId as keyof typeof parsers];
    const fullPath = path.join(process.cwd(), scriptPath);

    return new Promise<Response>((resolve) => {
      let output = '';
      let errorOutput = '';

      const child = spawn('node', [fullPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            output: output || 'Parser completed successfully',
            error: errorOutput || null
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            output: output,
            error: errorOutput || `Parser exited with code ${code}`
          }, { status: 500 }));
        }
      });

      child.on('error', (error) => {
        resolve(NextResponse.json({
          success: false,
          output: output,
          error: `Failed to start parser: ${error.message}`
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Parser execution error:', error);
    return NextResponse.json(
      { error: 'Failed to run parser' },
      { status: 500 }
    );
  }
} 