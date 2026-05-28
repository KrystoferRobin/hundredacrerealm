import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthUser } from '@/lib/admin-auth';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  
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