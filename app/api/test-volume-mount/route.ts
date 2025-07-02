import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const testResults: {
      currentDir: string;
      parsedSessionsDir: string;
      parsedSessionsExists: boolean;
      canCreateDir: boolean;
      canWriteFile: boolean;
      testFileContent: string | null;
      sessionFolderExists: boolean;
      sessionFolderContents: string[];
      parserScriptExists: boolean;
      error: string | null;
    } = {
      currentDir: process.cwd(),
      parsedSessionsDir: '/app/public/parsed_sessions',
      parsedSessionsExists: fs.existsSync('/app/public/parsed_sessions'),
      canCreateDir: false,
      canWriteFile: false,
      testFileContent: null,
      sessionFolderExists: false,
      sessionFolderContents: [],
      parserScriptExists: false,
      error: null
    };

    // Check if parser script exists
    testResults.parserScriptExists = fs.existsSync('/app/scripts/process_all_sessions.js');

    // Try to create the directory if it doesn't exist
    if (!testResults.parsedSessionsExists) {
      try {
        fs.mkdirSync('/app/public/parsed_sessions', { recursive: true });
        testResults.canCreateDir = true;
        testResults.parsedSessionsExists = fs.existsSync('/app/public/parsed_sessions');
      } catch (e: any) {
        testResults.error = `Failed to create directory: ${e.message}`;
      }
    }

    // Try to write a test file
    if (testResults.parsedSessionsExists) {
      try {
        const testFilePath = '/app/public/parsed_sessions/test-volume-mount.txt';
        const testContent = `Test file created at ${new Date().toISOString()}\nCurrent directory: ${process.cwd()}`;
        fs.writeFileSync(testFilePath, testContent);
        testResults.canWriteFile = true;
        testResults.testFileContent = testContent;
      } catch (e: any) {
        testResults.error = `Failed to write test file: ${e.message}`;
      }
    }

    // Check if the test file was created
    const testFilePath = '/app/public/parsed_sessions/test-volume-mount.txt';
    if (fs.existsSync(testFilePath)) {
      testResults.testFileContent = fs.readFileSync(testFilePath, 'utf8');
    }

    // Check if session folder exists
    const sessionFolder = '/app/public/parsed_sessions/3man-done-dwarf-win';
    testResults.sessionFolderExists = fs.existsSync(sessionFolder);
    if (testResults.sessionFolderExists) {
      testResults.sessionFolderContents = fs.readdirSync(sessionFolder);
    }

    // List all contents of parsed_sessions directory
    const allContents = testResults.parsedSessionsExists ? fs.readdirSync('/app/public/parsed_sessions') : [];

    // Check what's in the uploads directory
    const uploadsDir = '/app/public/uploads';
    const uploadsExists = fs.existsSync(uploadsDir);
    const uploadsContents = uploadsExists ? fs.readdirSync(uploadsDir) : [];

    // Check if the 5man session folder was created
    const fiveManFolder = '/app/public/parsed_sessions/5man';
    const fiveManExists = fs.existsSync(fiveManFolder);
    const fiveManContents = fiveManExists ? fs.readdirSync(fiveManFolder) : [];

    // Try to run the parser manually to see what happens
    let parserOutput: string | null = null;
    let parserError: any = null;
    if (testResults.parserScriptExists) {
      try {
        const { execSync } = require('child_process');
        parserOutput = execSync('node /app/scripts/process_all_sessions.js', { 
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
      } catch (e: any) {
        parserError = {
          message: e.message,
          stdout: e.stdout || 'No output',
          stderr: e.stderr || 'No error output'
        };
      }
    }

    return NextResponse.json({
      ...testResults,
      allParsedSessionsContents: allContents,
      uploadsDirectory: {
        path: uploadsDir,
        exists: uploadsExists,
        contents: uploadsContents
      },
      fiveManSession: {
        path: fiveManFolder,
        exists: fiveManExists,
        contents: fiveManContents
      },
      parserOutput,
      parserError
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
} 