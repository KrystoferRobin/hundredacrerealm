import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const uploadsDirs = {
      '/app/.next/server/app/public/uploads': {
        exists: fs.existsSync('/app/.next/server/app/public/uploads'),
        contents: fs.existsSync('/app/.next/server/app/public/uploads') ? fs.readdirSync('/app/.next/server/app/public/uploads') : []
      },
      '/app/.next/server/app/uploads': {
        exists: fs.existsSync('/app/.next/server/app/uploads'),
        contents: fs.existsSync('/app/.next/server/app/uploads') ? fs.readdirSync('/app/.next/server/app/uploads') : []
      },
      '/app/uploads': {
        exists: fs.existsSync('/app/uploads'),
        contents: fs.existsSync('/app/uploads') ? fs.readdirSync('/app/uploads') : []
      }
    };

    const parsedDirs = {
      '/app/.next/server/app/public/parsed_sessions': {
        exists: fs.existsSync('/app/.next/server/app/public/parsed_sessions'),
        contents: fs.existsSync('/app/.next/server/app/public/parsed_sessions') ? fs.readdirSync('/app/.next/server/app/public/parsed_sessions') : []
      },
      '/app/public/parsed_sessions': {
        exists: fs.existsSync('/app/public/parsed_sessions'),
        contents: fs.existsSync('/app/public/parsed_sessions') ? fs.readdirSync('/app/public/parsed_sessions') : []
      }
    };

    // Check for the specific session folder
    const sessionFolder = '/app/public/parsed_sessions/3man-done-dwarf-win';
    const sessionFolderExists = fs.existsSync(sessionFolder);
    let sessionFolderContents: string[] = [];
    if (sessionFolderExists) {
      sessionFolderContents = fs.readdirSync(sessionFolder);
    }

    // Check if parsed_session.json exists
    const parsedSessionPath = '/app/public/parsed_sessions/3man-done-dwarf-win/parsed_session.json';
    const parsedSessionExists = fs.existsSync(parsedSessionPath);

    // Check current directory structure
    const currentDir = process.cwd();
    const parentDir = path.dirname(currentDir);
    const grandparentDir = path.dirname(parentDir);

    // Check if we can read the session data directly
    let sessionData: any = null;
    if (parsedSessionExists) {
      try {
        sessionData = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
      } catch (e: any) {
        sessionData = { error: e.message };
      }
    }

    return NextResponse.json({
      uploadsDirs,
      parsedDirs,
      sessionFolder: {
        path: sessionFolder,
        exists: sessionFolderExists,
        contents: sessionFolderContents
      },
      parsedSessionFile: {
        path: parsedSessionPath,
        exists: parsedSessionExists
      },
      sessionData: sessionData ? {
        sessionName: sessionData.sessionName,
        days: sessionData.days ? Object.keys(sessionData.days).length : 0,
        players: sessionData.players ? Object.keys(sessionData.players).length : 0
      } : null,
      currentDir,
      parentDir,
      grandparentDir
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
} 