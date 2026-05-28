import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book');

    if (!book) {
      return NextResponse.json({ error: 'Book parameter is required' }, { status: 400 });
    }

    const bookInfoPath = path.join(process.cwd(), 'coregamedata', 'knowledge', book, 'book-info.json');
    
    if (!fs.existsSync(bookInfoPath)) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookInfoContent = fs.readFileSync(bookInfoPath, 'utf-8');
    const bookInfo = JSON.parse(bookInfoContent);

    return NextResponse.json(bookInfo);
  } catch (error) {
    console.error('Error reading book info:', error);
    return NextResponse.json({ error: 'Failed to load book info' }, { status: 500 });
  }
} 