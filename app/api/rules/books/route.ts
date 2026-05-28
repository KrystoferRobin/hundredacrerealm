import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const knowledgePath = path.join(process.cwd(), 'coregamedata', 'knowledge');
    
    if (!fs.existsSync(knowledgePath)) {
      return NextResponse.json([]);
    }

    const items = fs.readdirSync(knowledgePath, { withFileTypes: true });
    const books = items
      .filter(item => item.isDirectory())
      .map(item => item.name);

    return NextResponse.json(books);
  } catch (error) {
    console.error('Error reading books:', error);
    return NextResponse.json({ error: 'Failed to load books' }, { status: 500 });
  }
} 