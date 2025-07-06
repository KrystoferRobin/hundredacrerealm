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

export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  
  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('session') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/json', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JSON and TXT files are allowed.' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Try to parse as JSON if it's a JSON file
    let sessionData;
    try {
      sessionData = JSON.parse(fileContent);
    } catch (error) {
      // If it's not JSON, treat it as raw text
      sessionData = { content: fileContent };
    }

    // Generate session ID (timestamp + random string)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sessionId = `${timestamp}_${randomString}`;

    // Create session directory
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Save the session file
    const sessionFilePath = path.join(sessionDir, 'parsed_session.json');
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload session' },
      { status: 500 }
    );
  }
} 