import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = '/app/public/parsed_sessions';
    
    const debug: any = {
      sessionsDir,
      exists: fs.existsSync(sessionsDir),
      currentWorkingDir: process.cwd(),
      absolutePath: path.resolve(sessionsDir),
      __dirname: __dirname,
      scriptPath: path.join(__dirname, '../../../scripts/init-container.js'),
      scriptExists: fs.existsSync(path.join(__dirname, '../../../scripts/init-container.js')),
    };
    
    if (fs.existsSync(sessionsDir)) {
      const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
      debug.items = items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        isFile: item.isFile()
      }));
      
      // Check for session folders specifically
      const sessionFolders = items.filter(item => item.isDirectory()).map(item => item.name);
      debug.sessionFolders = sessionFolders;
      
      // Check each folder for parsed_session.json
      debug.folderDetails = [];
      for (const folder of sessionFolders) {
        const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
        const hasSessionFile = fs.existsSync(sessionPath);
        
        debug.folderDetails.push({
          folder,
          sessionPath,
          hasSessionFile,
          files: hasSessionFile ? fs.readdirSync(path.join(sessionsDir, folder)) : []
        });
      }
      
      // Check permissions and ownership
      try {
        const stats = fs.statSync(sessionsDir);
        debug.permissions = {
          mode: stats.mode.toString(8),
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size
        };
      } catch (e) {
        debug.permissionsError = e.message;
      }
    }
    
    // Check only the correct path
    debug.correctPath = {
      path: '/app/public/parsed_sessions',
      exists: fs.existsSync('/app/public/parsed_sessions'),
      isDirectory: fs.existsSync('/app/public/parsed_sessions') ? fs.statSync('/app/public/parsed_sessions').isDirectory() : false,
      contents: fs.existsSync('/app/public/parsed_sessions') ? fs.readdirSync('/app/public/parsed_sessions') : []
    };
    
    return NextResponse.json(debug);
  } catch (error) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      sessionsDir: '/app/public/parsed_sessions',
      exists: fs.existsSync('/app/public/parsed_sessions')
    });
  }
} 