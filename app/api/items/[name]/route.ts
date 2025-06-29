import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Item {
  id: string;
  name: string;
  attributeBlocks: Record<string, any>;
  parts: any[];
}

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const itemName = decodeURIComponent(params.name);
    const itemsDir = path.join(process.cwd(), 'coregamedata', 'items');
    
    if (!fs.existsSync(itemsDir)) {
      return NextResponse.json(
        { error: 'Items directory not found' },
        { status: 404 }
      );
    }

    // Search in all item categories
    const categories = ['armor', 'weapon', 'treasure'];
    let item: Item | null = null;

    for (const category of categories) {
      const categoryDir = path.join(itemsDir, category);
      if (!fs.existsSync(categoryDir)) continue;

      const files = fs.readdirSync(categoryDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const itemPath = path.join(categoryDir, file);
        const itemData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
        
        if (itemData.name === itemName) {
          item = {
            id: itemData.id,
            name: itemData.name,
            attributeBlocks: itemData.attributeBlocks || {},
            parts: itemData.parts || []
          };
          break;
        }
      }
      
      if (item) break;
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });

  } catch (error) {
    console.error('Error reading item:', error);
    return NextResponse.json(
      { error: 'Failed to load item' },
      { status: 500 }
    );
  }
} 