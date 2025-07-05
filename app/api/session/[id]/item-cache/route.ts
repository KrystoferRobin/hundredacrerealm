import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Define cache file path
    const cacheDir = path.join(process.cwd(), 'public', 'parsed_sessions', sessionId);
    const cacheFile = path.join(cacheDir, 'item_cache.json');
    
    // Check if cache already exists and is recent (less than 1 hour old)
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageInHours < 1) {
        // Return cached data
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return NextResponse.json({
          items: cachedData,
          source: 'cache',
          cacheAge: ageInHours
        });
      }
    }
    
    // Load session data to get all items
    const sessionFile = path.join(cacheDir, 'parsed_session.json');
    if (!fs.existsSync(sessionFile)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    
    // Collect all unique item names from the session
    const allItems = new Set<string>();
    
    // Extract items from character inventories
    if (sessionData.characterInventories) {
      Object.values(sessionData.characterInventories).forEach((charData: any) => {
        if (charData?.items) {
          const itemArrays = [
            charData.items.weapons,
            charData.items.armor,
            charData.items.treasures,
            charData.items.great_treasures,
            charData.items.spells,
            charData.items.natives,
            charData.items.other,
            charData.items.unknown
          ];
          
          itemArrays.flat().filter(Boolean).forEach((item: any) => {
            if (item?.name) {
              allItems.add(item.name);
            }
          });
        }
      });
    }
    
    // Extract items from game text (mentions in actions, etc.)
    Object.values(sessionData.days || {}).forEach((dayData: any) => {
      if (dayData.characterTurns) {
        dayData.characterTurns.forEach((turn: any) => {
          if (turn.actions) {
            turn.actions.forEach((action: any) => {
              // Simple regex to find item mentions in action text
              const itemMatches = action.action?.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
              itemMatches.forEach((match: string) => {
                // Filter out common words that aren't items
                const commonWords = ['the', 'and', 'or', 'but', 'with', 'from', 'to', 'in', 'on', 'at', 'by', 'for', 'of', 'a', 'an'];
                if (!commonWords.includes(match.toLowerCase()) && match.length > 2) {
                  allItems.add(match);
                }
              });
            });
          }
        });
      }
    });
    
    const itemNames = Array.from(allItems);
    
    if (itemNames.length === 0) {
      return NextResponse.json({ items: {}, source: 'empty' });
    }
    
    // Fetch all items in bulk
    const bulkResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/items/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemNames })
    });
    
    if (!bulkResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
    
    const bulkData = await bulkResponse.json();
    
    // Save to cache file
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(bulkData.items, null, 2));
    } catch (error) {
      console.error('Failed to write cache file:', error);
      // Continue without caching
    }
    
    return NextResponse.json({
      items: bulkData.items,
      source: 'generated',
      totalItems: itemNames.length,
      foundItems: Object.keys(bulkData.items).length,
      errors: bulkData.errors
    });
    
  } catch (error) {
    console.error('Error in item cache API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 