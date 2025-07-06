import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const testDir = '/app/public/parsed_sessions';
    const testFile = path.join(testDir, 'test-volume.txt');
    const testContent = `Volume test at ${new Date().toISOString()}`;
    
    // Try to create the directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      try {
        fs.mkdirSync(testDir, { recursive: true });
      } catch (mkdirError) {
        return NextResponse.json({
          error: 'Failed to create directory',
          mkdirError: mkdirError.message,
          testDir
        });
      }
    }
    
    // Try to write a test file
    try {
      fs.writeFileSync(testFile, testContent);
    } catch (writeError) {
      return NextResponse.json({
        error: 'Failed to write test file',
        writeError: writeError.message,
        testFile
      });
    }
    
    // Try to read it back
    try {
      const readContent = fs.readFileSync(testFile, 'utf8');
      return NextResponse.json({
        success: true,
        testDir,
        testFile,
        writtenContent: testContent,
        readContent,
        dirExists: fs.existsSync(testDir),
        fileExists: fs.existsSync(testFile),
        dirContents: fs.existsSync(testDir) ? fs.readdirSync(testDir) : []
      });
    } catch (readError) {
      return NextResponse.json({
        error: 'Failed to read test file',
        readError: readError.message,
        testFile
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
} 