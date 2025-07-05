import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Item {
  id: string;
  name: string;
  type: string;
  description?: string;
  image?: string;
  attributeBlocks: Record<string, any>;
}

interface ItemGroup {
  category: string;
  displayName: string;
  items: Item[];
}

export async function GET() {
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'coregamedata', 'items'),
      '/app/coregamedata/items'
    ];
    const itemsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!itemsDir) {
      return NextResponse.json({ itemGroups: [] });
    }

    const itemGroups: ItemGroup[] = [];
    const categories = ['armor', 'treasure', 'weapon'];

    for (const category of categories) {
      const categoryPath = path.join(itemsDir, category);
      
      if (!fs.existsSync(categoryPath)) {
        continue;
      }

      const items: Item[] = [];
      const seenNames = new Set<string>();

      const files = fs.readdirSync(categoryPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => dirent.name);

      for (const filename of files) {
        try {
          const filePath = path.join(categoryPath, filename);
          const itemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Only include the first item if there are duplicates with the same name
          if (!seenNames.has(itemData.name)) {
            seenNames.add(itemData.name);
            
            items.push({
              id: itemData.id || filename.replace('.json', ''),
              name: itemData.name,
              type: category,
              description: itemData.description,
              image: itemData.image,
              attributeBlocks: itemData.attributeBlocks || {}
            });
          }
        } catch (error) {
          console.error(`Error reading item file ${filename}:`, error);
        }
      }

      // Sort items alphabetically
      items.sort((a, b) => a.name.localeCompare(b.name));

      if (items.length > 0) {
        const displayNames = {
          armor: 'Armor',
          treasure: 'Treasures',
          weapon: 'Weapons'
        };

        itemGroups.push({
          category,
          displayName: displayNames[category as keyof typeof displayNames] || category,
          items
        });
      }
    }

    return NextResponse.json({ itemGroups });
  } catch (error) {
    console.error('Error reading items:', error);
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 });
  }
} 