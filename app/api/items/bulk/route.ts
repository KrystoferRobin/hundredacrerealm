import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { itemNames } = await request.json();
    
    if (!Array.isArray(itemNames)) {
      return NextResponse.json({ error: 'itemNames must be an array' }, { status: 400 });
    }

    const results: Record<string, any> = {};
    const errors: string[] = [];

    // Try multiple possible paths for the items directory
    const possiblePaths = [
      path.join(process.cwd(), 'coregamedata', 'items'),  // Local development path
      '/app/coregamedata/items',  // Docker container path (primary)
      path.join('/app', 'coregamedata', 'items'),  // Alternative Docker path
    ];
    
    let itemsDir: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        itemsDir = possiblePath;
        break;
      }
    }

    if (!itemsDir) {
      return NextResponse.json({ error: 'Items directory not found' }, { status: 500 });
    }

    // Process items in parallel batches
    const batchSize = 10; // Process 10 items at a time
    for (let i = 0; i < itemNames.length; i += batchSize) {
      const batch = itemNames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (itemName: string) => {
        try {
          // Try to find the item in the items directory
          const itemPath = path.join(itemsDir, `${itemName}.json`);
          
          if (fs.existsSync(itemPath)) {
            const itemData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
            return { name: itemName, item: itemData };
          } else {
            // Try spells directory
            const spellPath = path.join(process.cwd(), 'coregamedata', 'spells', `${itemName}.json`);
            if (fs.existsSync(spellPath)) {
              const spellData = JSON.parse(fs.readFileSync(spellPath, 'utf8'));
              return { name: itemName, item: spellData };
            }
            
            errors.push(`Item not found: ${itemName}`);
            return { name: itemName, item: null };
          }
        } catch (error) {
          console.error(`Error fetching item ${itemName}:`, error);
          errors.push(`Error fetching ${itemName}: ${error.message}`);
          return { name: itemName, item: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results to the main results object
      batchResults.forEach(({ name, item }) => {
        if (item) {
          results[name] = item;
        }
      });
    }

    return NextResponse.json({
      items: results,
      errors,
      totalRequested: itemNames.length,
      totalFound: Object.keys(results).length,
      totalErrors: errors.length
    });

  } catch (error) {
    console.error('Error in bulk items API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 