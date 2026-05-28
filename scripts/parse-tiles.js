const fs = require('fs');
const path = require('path');

// Parse all GameObjects and index by id
function parseGameObjects(xmlContent) {
  const gameObjects = new Map();
  const gameObjectRegex = /<GameObject[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/GameObject>/g;
  let match;
  while ((match = gameObjectRegex.exec(xmlContent)) !== null) {
    const id = match[1];
    const name = match[2];
    const content = match[3];
    gameObjects.set(id, { id, name, content });
  }
  return gameObjects;
}

// Parse attribute blocks from a GameObject content
function parseAttributeBlocks(content) {
  const attributeBlocks = {};
  const blockRegex = /<AttributeBlock[^>]*blockName="([^"]*)"[^>]*>([\s\S]*?)<\/AttributeBlock>/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const blockName = blockMatch[1];
    const blockContent = blockMatch[2];
    const attributes = {};
    const attrRegex = /<attribute\s+([^>]*)\/>/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(blockContent)) !== null) {
      const attrString = attrMatch[1];
      const attrNameMatch = attrString.match(/(\w+)="([^"]*)"/);
      if (attrNameMatch) {
        const attrName = attrNameMatch[1];
        const attrValue = attrNameMatch[2];
        attributes[attrName] = attrValue;
      }
    }
    attributeBlocks[blockName] = attributes;
  }
  return attributeBlocks;
}

// Find all <contains id="..."/> in a GameObject content
function findContainedIds(content) {
  const ids = [];
  const containsRegex = /<contains id="([^"]*)"[^>]*\/>/g;
  let match;
  while ((match = containsRegex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Check if a GameObject is a tile (has tile attr)
function isTile(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'tile');
}

// Check if a GameObject should be excluded
function shouldExclude(name) {
  return name === 'Test Boon Card';
}

// Create safe filename
function createSafeFileName(name) {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

function main() {
  try {
    console.log('Parsing MagicRealmData.xml for tiles...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    
    // Collect all tiles
    const tiles = [];
    
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      if (isTile(attributeBlocks)) {
        const tile = {
          id,
          name: obj.name,
          attributeBlocks,
          parts: []
        };
        
        // Find all contained ids and add their parsed data as parts
        const containedIdsInThis = findContainedIds(obj.content);
        for (const partId of containedIdsInThis) {
          if (gameObjects.has(partId)) {
            const partObj = gameObjects.get(partId);
            const partAttributeBlocks = parseAttributeBlocks(partObj.content);
            tile.parts.push({
              id: partObj.id,
              name: partObj.name,
              attributeBlocks: partAttributeBlocks
            });
          }
        }
        
        tiles.push(tile);
      }
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'tiles');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Clear existing files
    const existingFiles = fs.readdirSync(outputDir);
    for (const file of existingFiles) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    }
    
    console.log(`\nProcessing tiles (${tiles.length} tiles):`);
    for (const tile of tiles) {
      const safeName = createSafeFileName(tile.name);
      const filename = `${safeName}_${tile.id}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(tile, null, 2));
      console.log(`  Saved: ${filename} (${tile.parts.length} parts)`);
    }
    
    console.log(`\n✅ Successfully parsed and saved ${tiles.length} tiles to ${outputDir}`);
    
    // Show some statistics about tile types
    const tileTypes = new Map();
    for (const tile of tiles) {
      const tileType = tile.attributeBlocks.this?.tile_type || 'unknown';
      if (!tileTypes.has(tileType)) {
        tileTypes.set(tileType, 0);
      }
      tileTypes.set(tileType, tileTypes.get(tileType) + 1);
    }
    
    console.log(`\nTile types found:`);
    for (const [tileType, count] of tileTypes) {
      console.log(`  Type ${tileType}: ${count} tiles`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing tiles:', error);
    process.exit(1);
  }
}

main(); 