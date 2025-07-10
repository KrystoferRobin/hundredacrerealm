import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Check if session directory exists
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!sessionsDir) {
      return NextResponse.json(
        { error: 'Sessions directory not found' },
        { status: 404 }
      );
    }
    
    const sessionDir = path.join(sessionsDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Change to session directory and run the process_session.js script
    const originalCwd = process.cwd();
    
    return new Promise<Response>((resolve) => {
      let output = '';
      let errorOutput = '';

      // Change to session directory
      process.chdir(sessionDir);
      
      // Run the enhanced processing pipeline for this session
      const child = spawn('node', [
        path.join(originalCwd, 'scripts', 'enhanced_character_parser.js')
      ], {
        cwd: sessionDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        // Change back to original directory
        process.chdir(originalCwd);
        
        if (code === 0) {
          // Run track_map_state.js to generate map state data
          const mapStateChild = spawn('node', [
            path.join(originalCwd, 'scripts', 'track_map_state.js')
          ], {
            cwd: sessionDir,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let mapStateOutput = '';
          let mapStateError = '';

          mapStateChild.stdout.on('data', (data) => {
            mapStateOutput += data.toString();
          });

          mapStateChild.stderr.on('data', (data) => {
            mapStateError += data.toString();
          });

          mapStateChild.on('close', (mapStateCode) => {
            resolve(NextResponse.json({
              success: true,
              output: output + '\n' + mapStateOutput,
              error: errorOutput || mapStateError || null,
              sessionId: sessionId
            }));
          });

          mapStateChild.on('error', (error) => {
            resolve(NextResponse.json({
              success: true, // Still success even if map state fails
              output: output,
              error: `Enhanced processing completed but map state generation failed: ${error.message}`,
              sessionId: sessionId
            }));
          });
        } else {
          resolve(NextResponse.json({
            success: false,
            output: output,
            error: errorOutput || `Processing exited with code ${code}`,
            sessionId: sessionId
          }, { status: 500 }));
        }
      });

      child.on('error', (error) => {
        process.chdir(originalCwd);
        resolve(NextResponse.json({
          success: false,
          output: output,
          error: `Failed to start processing: ${error.message}`,
          sessionId: sessionId
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Session processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process session' },
      { status: 500 }
    );
  }
} 