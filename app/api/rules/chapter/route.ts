import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book');
    const chapter = searchParams.get('chapter');

    if (!book || !chapter) {
      return NextResponse.json({ error: 'Book and chapter parameters are required' }, { status: 400 });
    }

    const chapterPath = path.join(process.cwd(), 'coregamedata', 'knowledge', book, `chapter_${chapter}.json`);
    
    if (!fs.existsSync(chapterPath)) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapterContent = fs.readFileSync(chapterPath, 'utf-8');
    const chapterData = JSON.parse(chapterContent);

    return NextResponse.json(chapterData);
  } catch (error) {
    console.error('Error reading chapter:', error);
    return NextResponse.json({ error: 'Failed to load chapter' }, { status: 500 });
  }
} 