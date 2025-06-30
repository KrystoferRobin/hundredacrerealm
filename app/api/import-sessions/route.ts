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
          reject(stderr || error.message);
        } else {
          resolve(stdout);
        }
      });
    });

    // Empty the /public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file !== '.DS_Store') {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }

    return NextResponse.json({ message: 'Import complete! All sessions processed and uploads folder emptied.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 