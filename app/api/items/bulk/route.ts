import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findDenizenByName } from '@/lib/coregamedata-lookup';

export async function POST(request: Request) {
  try {
    const { itemNames } = await request.json();
    
    if (!Array.isArray(itemNames)) {
      return NextResponse.json({ error: 'itemNames must be an array' }, { status: 400 });
    }

    const results: Record<string, any> = {};
    const errors: string[] = [];

    const itemsDir = path.join(process.cwd(), 'coregamedata', 'items');

    if (!fs.existsSync(itemsDir)) {
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
            
            const denizen = findDenizenByName(
              itemName,
              path.join(process.cwd(), 'coregamedata')
            );
            if (denizen) {
              return {
                name: itemName,
                item: {
                  id: denizen.id,
                  name: denizen.name,
                  denizenKind: denizen.denizenKind,
                  attributeBlocks: denizen.attributeBlocks,
                  parts: denizen.parts || [],
                },
              };
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