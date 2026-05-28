import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
    
    const debug: any = {
      sessionsDir,
      exists: fs.existsSync(sessionsDir),
      currentWorkingDir: process.cwd(),
      absolutePath: path.resolve(sessionsDir),
    };
    
    if (fs.existsSync(sessionsDir)) {
      const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
      debug.items = items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        isFile: item.isFile()
      }));
      
      const sessionFolders = items.filter(item => item.isDirectory()).map(item => item.name);
      debug.sessionFolders = sessionFolders;
      
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
      
      try {
        const stats = fs.statSync(sessionsDir);
        debug.permissions = {
          mode: stats.mode.toString(8),
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size
        };
      } catch (e: any) {
        debug.permissionsError = e.message;
      }
    }
    
    return NextResponse.json(debug);
  } catch (error: any) {
    const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      sessionsDir,
      exists: fs.existsSync(sessionsDir)
    });
  }
}
