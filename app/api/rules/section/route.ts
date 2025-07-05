import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');
    const section = searchParams.get('section');

    if (!book || !chapter || !section) {
      return NextResponse.json({ error: 'Book, chapter, and section parameters are required' }, { status: 400 });
    }

    const sectionPath = path.join(process.cwd(), 'coregamedata', 'knowledge', book, `chapter_${chapter}`, `${section}.json`);
    
    if (!fs.existsSync(sectionPath)) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const sectionContent = fs.readFileSync(sectionPath, 'utf-8');
    const sectionData = JSON.parse(sectionContent);

    return NextResponse.json(sectionData);
  } catch (error) {
    console.error('Error reading section:', error);
    return NextResponse.json({ error: 'Failed to load section' }, { status: 500 });
  }
} 