import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = {
      cwd: process.cwd(),
      __dirname: __dirname,
      parsedSessionsPath: path.join(process.cwd(), 'parsed_sessions'),
      absoluteParsedSessionsPath: path.resolve('parsed_sessions'),
      directPath: '/app/parsed_sessions',
      exists: {
        cwd: fs.existsSync(process.cwd()),
        parsedSessions: fs.existsSync(path.join(process.cwd(), 'parsed_sessions')),
        directPath: fs.existsSync('/app/parsed_sessions'),
        absolutePath: fs.existsSync(path.resolve('parsed_sessions'))
      },
      contents: {
        cwd: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : [],
        parsedSessions: fs.existsSync(path.join(process.cwd(), 'parsed_sessions')) ? fs.readdirSync(path.join(process.cwd(), 'parsed_sessions')) : [],
        directPath: fs.existsSync('/app/parsed_sessions') ? fs.readdirSync('/app/parsed_sessions') : []
      },
      userInfo: {
        uid: process.getuid ? process.getuid() : 'unknown',
        gid: process.getgid ? process.getgid() : 'unknown',
        groups: process.getgroups ? process.getgroups() : 'unknown'
      }
    };
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
} 