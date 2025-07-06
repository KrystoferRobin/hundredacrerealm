import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the data directories we want to manage
const DATA_DIRECTORIES = {
  'coregamedata/characters': 'Character Data',
  'coregamedata/chits': 'Chit Data',
  'coregamedata/items': 'Item Data',
  'coregamedata/monsters': 'Monster Data',
  'coregamedata/natives': 'Native Data',
  'coregamedata/spells': 'Spell Data',
  'coregamedata/tiles': 'Tile Data',
  'coregamedata/knowledge': 'Knowledge Data',
  'public/stats': 'Statistics Data',
  'characters': 'Character Files'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filePath = searchParams.get('path');

    if (action === 'list') {
      // List all data files
      const allFiles: { [category: string]: Array<{ name: string; path: string; size: number; modified: string }> } = {};

      for (const [dirPath, categoryName] of Object.entries(DATA_DIRECTORIES)) {
        const fullPath = path.join(process.cwd(), dirPath);
        
        if (fs.existsSync(fullPath)) {
          allFiles[categoryName] = [];
          
          const files = getAllJsonFiles(fullPath, dirPath);
          allFiles[categoryName] = files;
        }
      }

      return NextResponse.json({ files: allFiles });
    }

    if (action === 'read' && filePath) {
      // Read a specific file
      const fullPath = path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(content);
        const stats = fs.statSync(fullPath);
        
        return NextResponse.json({
          content: data,
          originalContent: content,
          stats: {
            size: stats.size,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString()
          }
        });
      } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in data management API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, filePath, content } = body;

    if (action === 'save' && filePath && content) {
      const fullPath = path.join(process.cwd(), filePath);
      
      // Ensure the directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Validate JSON before saving
      try {
        JSON.stringify(content, null, 2);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON content' }, { status: 400 });
      }

      // Create backup
      if (fs.existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        fs.copyFileSync(fullPath, backupPath);
      }

      // Save the file
      fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
      
      return NextResponse.json({ success: true, message: 'File saved successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}

// Helper function to recursively get all JSON files
function getAllJsonFiles(dirPath: string, relativePath: string): Array<{ name: string; path: string; size: number; modified: string }> {
  const files: Array<{ name: string; path: string; size: number; modified: string }> = [];
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relativeFilePath = path.join(relativePath, item.name);
      
      if (item.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = getAllJsonFiles(fullPath, relativeFilePath);
        files.push(...subFiles);
      } else if (item.isFile() && item.name.endsWith('.json')) {
        // Add JSON file
        const stats = fs.statSync(fullPath);
        files.push({
          name: item.name,
          path: relativeFilePath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
} 