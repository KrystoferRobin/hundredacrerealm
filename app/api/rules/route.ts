import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || 'rules_v3.1';
  const chapter = searchParams.get('chapter');

  try {
    const rulesPath = path.join(process.cwd(), 'coregamedata', 'knowledge', 'rules', version);
    
    if (chapter) {
      // Return specific chapter
      const chapterFile = path.join(rulesPath, `chapter${chapter}.json`);
      if (!fs.existsSync(chapterFile)) {
        return NextResponse.json({ error: `Chapter ${chapter} not found for ${version}.` }, { status: 404 });
      }
      
      const chapterData = JSON.parse(fs.readFileSync(chapterFile, 'utf8'));
      return NextResponse.json(chapterData);
    } else {
      // Return rules manual (table of contents)
      const manualFile = path.join(rulesPath, 'rules-manual.json');
      if (!fs.existsSync(manualFile)) {
        return NextResponse.json({ error: `Rules manual not found for ${version}.` }, { status: 404 });
      }
      
      const manualData = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
      
      // Always provide a 'chapters' array for the frontend
      let chapters = manualData.chapters;
      if (!chapters && manualData.sections) {
        chapters = manualData.sections;
      }
      // Remove 'sections' from the response to avoid confusion
      const { sections, ...rest } = manualData;
      
      // Also include version info
      const titleFile = path.join(rulesPath, 'title.txt');
      const attributionFile = path.join(rulesPath, 'attribution.json');
      
      let title = 'Magic Realm Rules';
      let attribution = {};
      
      if (fs.existsSync(titleFile)) {
        title = fs.readFileSync(titleFile, 'utf8').trim();
      }
      
      if (fs.existsSync(attributionFile)) {
        attribution = JSON.parse(fs.readFileSync(attributionFile, 'utf8'));
      }
      
      return NextResponse.json({
        ...rest,
        chapters,
        title,
        attribution,
        version
      });
    }
  } catch (error) {
    console.error('Error loading rules:', error);
    return NextResponse.json({ error: 'Failed to load rules data.' }, { status: 500 });
  }
} 