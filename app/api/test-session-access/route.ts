import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = '/app/public/parsed_sessions';
    
    // Use the exact same logic as the init script
    const test: any = {
      sessionsDir,
      exists: fs.existsSync(sessionsDir),
      currentWorkingDir: process.cwd(),
      absolutePath: path.resolve(sessionsDir),
    };
    
    // Explore the /app directory structure to understand what's accessible
    test.appDir = {
      exists: fs.existsSync('/app'),
      contents: fs.existsSync('/app') ? fs.readdirSync('/app') : [],
    };
    
    test.publicDir = {
      exists: fs.existsSync('/app/public'),
      contents: fs.existsSync('/app/public') ? fs.readdirSync('/app/public') : [],
    };
    
    // Check only the correct path
    test.possiblePaths = {
      '/app/public/parsed_sessions': fs.existsSync('/app/public/parsed_sessions'),
    };
    
    // Check the Next.js build structure
    test.nextjsStructure = {
      '.next': fs.existsSync('/app/.next'),
      '.next/standalone': fs.existsSync('/app/.next/standalone'),
      '.next/static': fs.existsSync('/app/.next/static'),
    };
    
    // Test volume mount by trying to create a test file
    test.volumeTest = {
      canWrite: false,
      canCreateDir: false,
      error: null
    };
    
    try {
      // Try to create a test file in parsed_sessions
      const testFile = path.join(sessionsDir, 'api-test-file.txt');
      fs.writeFileSync(testFile, 'API test file created at ' + new Date().toISOString());
      test.volumeTest.canWrite = true;
      
      // Try to create a test directory
      const testDir = path.join(sessionsDir, 'api-test-dir');
      fs.mkdirSync(testDir, { recursive: true });
      test.volumeTest.canCreateDir = true;
      
      // Clean up test files
      try {
        fs.unlinkSync(testFile);
        fs.rmdirSync(testDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    } catch (e) {
      test.volumeTest.error = e.message;
    }
    
    // Check if the directory exists but is empty
    if (fs.existsSync(sessionsDir)) {
      const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
      test.items = items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        isFile: item.isFile()
      }));
      
      // Check for session folders specifically (same as init script)
      const sessionFolders = items.filter(item => item.isDirectory()).map(item => item.name);
      test.sessionFolders = sessionFolders;
      
      // Check each folder for parsed_session.json
      test.folderDetails = [];
      for (const folder of sessionFolders) {
        const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
        const hasSessionFile = fs.existsSync(sessionPath);
        
        test.folderDetails.push({
          folder,
          sessionPath,
          hasSessionFile,
          files: hasSessionFile ? fs.readdirSync(path.join(sessionsDir, folder)) : []
        });
      }
      
      // Check permissions and ownership
      test.permissions = {
        sessionsDirStats: fs.statSync(sessionsDir),
        sessionsDirMode: fs.statSync(sessionsDir).mode.toString(8),
        sessionsDirUid: fs.statSync(sessionsDir).uid,
        sessionsDirGid: fs.statSync(sessionsDir).gid,
      };
      
      // Check if we can access hidden files
      test.hiddenFiles = [];
      try {
        const allItems = fs.readdirSync(sessionsDir);
        test.hiddenFiles = allItems.filter(item => item.startsWith('.'));
      } catch (e) {
        test.hiddenFilesError = e.message;
      }
      
      // Try to access the session folder directly by name
      const sessionFolderName = '3man-done-dwarf-win_2025-07-01T17-26-42_mgjd6ggk';
      const sessionFolderPath = path.join(sessionsDir, sessionFolderName);
      test.directAccess = {
        sessionFolderName,
        sessionFolderPath,
        exists: fs.existsSync(sessionFolderPath),
        canAccess: false,
        error: null
      };
      
      if (fs.existsSync(sessionFolderPath)) {
        try {
          const contents = fs.readdirSync(sessionFolderPath);
          test.directAccess.canAccess = true;
          test.directAccess.contents = contents;
        } catch (e) {
          test.directAccess.error = e.message;
        }
      }
      
      // Test path resolution differences
      test.pathResolution = {
        // Test different ways to resolve the path
        absolute: path.resolve(sessionsDir),
        relative: path.relative(process.cwd(), sessionsDir),
        join: path.join(process.cwd(), 'public', 'parsed_sessions'),
        normalize: path.normalize(sessionsDir),
        
        // Test if we can access from different working directories
        fromApp: (() => {
          try {
            return {
              cwd: process.cwd(),
              exists: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions')),
              contents: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions')) ? fs.readdirSync(path.join(process.cwd(), 'public', 'parsed_sessions')) : []
            };
          } catch (e) {
            return { error: e.message };
          }
        })(),
        
        // Test if we can access from scripts directory
        fromScripts: (() => {
          try {
            return {
              cwd: process.cwd(),
              exists: fs.existsSync(path.join(process.cwd(), 'scripts', '../public/parsed_sessions')),
              contents: fs.existsSync(path.join(process.cwd(), 'scripts', '../public/parsed_sessions')) ? fs.readdirSync(path.join(process.cwd(), 'scripts', '../public/parsed_sessions')) : []
            };
          } catch (e) {
            return { error: e.message };
          }
        })()
      };
    }
    
    // Add comprehensive volume mount debugging
    test.volumeDebug = {
      // Check if we can create the parsed_sessions directory
      canCreateParsedSessions: (() => {
        try {
          fs.mkdirSync(sessionsDir, { recursive: true });
          return true;
        } catch (e) {
          return { error: e.message };
        }
      })(),
      
      // Check what's in the public directory after trying to create parsed_sessions
      publicDirAfterCreate: (() => {
        try {
          return fs.readdirSync(path.join(process.cwd(), 'public'));
        } catch (e) {
          return { error: e.message };
        }
      })(),
      
      // Check if there are any symlinks in the public directory
      publicDirSymlinks: (() => {
        try {
          const items = fs.readdirSync(path.join(process.cwd(), 'public'), { withFileTypes: true });
          return items.filter(item => item.isSymbolicLink()).map(item => item.name);
        } catch (e) {
          return { error: e.message };
        }
      })(),
      
      // Check the actual file system structure
      fileSystemCheck: {
        currentDir: fs.existsSync(process.cwd()),
        publicDir: fs.existsSync(path.join(process.cwd(), 'public')),
        parsedSessionsDir: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions')),
        uploadsDir: fs.existsSync(path.join(process.cwd(), 'public', 'uploads')),
      }
    };
    
    // Test the exact same Node.js code that works in the container
    test.nodeTest = {
      // Test from current directory
      fromApp: (() => {
        try {
          return {
            cwd: process.cwd(),
            exists: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions')),
            contents: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions')) ? fs.readdirSync(path.join(process.cwd(), 'public', 'parsed_sessions')) : []
          };
        } catch (e) {
          return { error: e.message };
        }
      })(),
      
      // Test from .next/server/app/api directory
      fromApi: (() => {
        try {
          return {
            cwd: process.cwd(),
            exists: fs.existsSync(path.join(process.cwd(), '.next', 'server', 'app', 'api', '../../../../public/parsed_sessions')),
            contents: fs.existsSync(path.join(process.cwd(), '.next', 'server', 'app', 'api', '../../../../public/parsed_sessions')) ? fs.readdirSync(path.join(process.cwd(), '.next', 'server', 'app', 'api', '../../../../public/parsed_sessions')) : []
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    };
    
    // Check for multiple parsed_sessions directories
    test.multipleDirs = {
      allParsedSessionsDirs: (() => {
        try {
          const result: any[] = [];
          const searchPaths = ['/app', '/app/public', '/app/scripts'];
          
          for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
              const items = fs.readdirSync(searchPath, { withFileTypes: true });
              for (const item of items) {
                if (item.isDirectory() && item.name === 'parsed_sessions') {
                  const fullPath = path.join(searchPath, item.name);
                  const contents = fs.readdirSync(fullPath);
                  result.push({
                    path: fullPath,
                    contents: contents,
                    count: contents.length
                  });
                }
              }
            }
          }
          return result;
        } catch (e) {
          return { error: e.message };
        }
      })(),
      
      // Check what the init script would see
      initScriptView: (() => {
        try {
          const sessionsDir = path.join(process.cwd(), 'scripts', '../public/parsed_sessions');
          if (fs.existsSync(sessionsDir)) {
            const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
            return {
              exists: true,
              items: items.map(item => ({
                name: item.name,
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
              })),
              sessionFolders: items.filter(item => item.isDirectory()).map(item => item.name)
            };
          } else {
            return { exists: false };
          }
        } catch (e) {
          return { error: e.message };
        }
      })()
    };
    
    return NextResponse.json(test);
  } catch (error) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      sessionsDir: path.join(process.cwd(), 'public', 'parsed_sessions'),
      exists: fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions'))
    });
  }
} 