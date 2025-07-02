import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    // Run the session import script
    const scriptsDir = path.join(process.cwd(), 'scripts');
    await new Promise((resolve, reject) => {
      exec('node process_all_sessions.js', { cwd: scriptsDir }, (error, stdout, stderr) => {
        if (error) {
          console.error('Script execution error:', error);
          console.error('stderr:', stderr);
          reject(stderr || error.message);
        } else {
          console.log('Script output:', stdout);
          resolve(stdout);
        }
      });
    });

    // Empty the uploads directory (check multiple possible locations)
    const possibleUploadsDirs = [
      path.join(process.cwd(), 'public', 'uploads'),  // Local development
      path.join(process.cwd(), 'uploads'),            // Docker container
      '/app/uploads'                                  // Docker container absolute path
    ];
    
    let uploadsDir: string | null = null;
    for (const dir of possibleUploadsDirs) {
      if (fs.existsSync(dir)) {
        uploadsDir = dir;
        break;
      }
    }
    
    if (uploadsDir) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.DS_Store') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log(`Cleaned uploads directory: ${uploadsDir}`);
    } else {
      console.log('No uploads directory found to clean');
    }

    return NextResponse.json({ message: 'Import complete! All sessions processed and uploads folder emptied.' });
  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 