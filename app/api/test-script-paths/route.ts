import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const test = {
      apiPath: '/app/public/parsed_sessions',
      apiExists: fs.existsSync('/app/public/parsed_sessions'),
      apiContents: fs.existsSync('/app/public/parsed_sessions') ? fs.readdirSync('/app/public/parsed_sessions') : [],
      
      // Test what the scripts would see
      scriptRelativePath: path.join(__dirname, '../../../scripts/../public/parsed_sessions'),
      scriptRelativeExists: fs.existsSync(path.join(__dirname, '../../../scripts/../public/parsed_sessions')),
      scriptRelativeContents: fs.existsSync(path.join(__dirname, '../../../scripts/../public/parsed_sessions')) ? 
        fs.readdirSync(path.join(__dirname, '../../../scripts/../public/parsed_sessions')) : [],
      
      // Test from scripts directory perspective
      fromScriptsDir: path.join('/app/scripts/../public/parsed_sessions'),
      fromScriptsDirExists: fs.existsSync(path.join('/app/scripts/../public/parsed_sessions')),
      fromScriptsDirContents: fs.existsSync(path.join('/app/scripts/../public/parsed_sessions')) ? 
        fs.readdirSync(path.join('/app/scripts/../public/parsed_sessions')) : [],
      
      // Test resolved paths
      resolvedApiPath: path.resolve('/app/public/parsed_sessions'),
      resolvedScriptPath: path.resolve('/app/scripts/../public/parsed_sessions'),
      
      // Check if they're the same
      pathsMatch: path.resolve('/app/public/parsed_sessions') === path.resolve('/app/scripts/../public/parsed_sessions')
    };
    
    return NextResponse.json(test);
  } catch (error) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack
    });
  }
} 