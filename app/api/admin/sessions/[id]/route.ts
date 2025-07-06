import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAuth(request);
  
  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const sessionId = params.id;
  const sessionPath = path.join(SESSIONS_DIR, sessionId);

  try {
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Recursively delete the session directory
    fs.rmSync(sessionPath, { recursive: true, force: true });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
} 