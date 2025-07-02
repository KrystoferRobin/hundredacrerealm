import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionDir = '/app/public/parsed_sessions/3man-done-dwarf-win';
    const sessionFile = path.join(sessionDir, 'parsed_session.json');
    
    const results: {
      sessionDirExists: boolean;
      sessionDirContents: string[];
      sessionFileExists: boolean;
      sessionFileContent: any;
      error: string | null;
    } = {
      sessionDirExists: false,
      sessionDirContents: [],
      sessionFileExists: false,
      sessionFileContent: null,
      error: null
    };
    
    try {
      // Check if session directory exists
      results.sessionDirExists = fs.existsSync(sessionDir);
      
      if (results.sessionDirExists) {
        results.sessionDirContents = fs.readdirSync(sessionDir);
        
        // Try to read the parsed_session.json file
        results.sessionFileExists = fs.existsSync(sessionFile);
        
        if (results.sessionFileExists) {
          try {
            const content = fs.readFileSync(sessionFile, 'utf8');
            const parsed = JSON.parse(content);
            results.sessionFileContent = {
              sessionName: parsed.sessionName,
              players: Object.keys(parsed.players || {}),
              days: Object.keys(parsed.days || {}).length
            };
          } catch (parseError) {
            results.error = `Failed to parse session file: ${parseError.message}`;
          }
        }
      }
    } catch (error) {
      results.error = `Failed to access session directory: ${error.message}`;
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message
    }, { status: 500 });
  }
} 