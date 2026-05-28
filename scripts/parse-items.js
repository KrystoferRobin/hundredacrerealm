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

// Check if a GameObject is an item (has item attr)
function isItem(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'item');
}

// Check if a GameObject is a treasure (has treasure, magic, or super_realm_treasure attr)
function isTreasure(attributeBlocks) {
  return (
    attributeBlocks.this && (
      Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'treasure') ||
      Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'magic') ||
      Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'super_realm_treasure')
    )
  );
}

// Check if a GameObject is armor (has armor attr)
function isArmor(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'armor');
}

// Check if a GameObject is a weapon (has weapon attr)
function isWeapon(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'weapon');
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
    console.log('Parsing MagicRealmData.xml for items...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    
    // Categorize items
    const treasures = [];
    const armor = [];
    const weapons = [];
    
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      if (isItem(attributeBlocks)) {
        const item = {
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
            item.parts.push({
              id: partObj.id,
              name: partObj.name,
              attributeBlocks: partAttributeBlocks
            });
          }
        }
        
        // Categorize based on attributes (treasure takes priority)
        if (isTreasure(attributeBlocks)) {
          treasures.push(item);
        } else if (isArmor(attributeBlocks)) {
          armor.push(item);
        } else if (isWeapon(attributeBlocks)) {
          weapons.push(item);
        }
      }
    }
    
    // Create output directories
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'items');
    const treasureDir = path.join(outputDir, 'treasure');
    const armorDir = path.join(outputDir, 'armor');
    const weaponDir = path.join(outputDir, 'weapon');
    
    [outputDir, treasureDir, armorDir, weaponDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Clear existing files
    [treasureDir, armorDir, weaponDir].forEach(dir => {
      const existingFiles = fs.readdirSync(dir);
      for (const file of existingFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    });
    
    let totalCount = 0;
    
    // Save treasures
    console.log(`\nProcessing treasures (${treasures.length} items):`);
    for (const item of treasures) {
      const safeName = createSafeFileName(item.name);
      const filename = `${safeName}_${item.id}.json`;
      const filepath = path.join(treasureDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(item, null, 2));
      console.log(`  Saved: ${filename} (${item.parts.length} parts)`);
      totalCount++;
    }
    
    // Save armor
    console.log(`\nProcessing armor (${armor.length} items):`);
    for (const item of armor) {
      const safeName = createSafeFileName(item.name);
      const filename = `${safeName}_${item.id}.json`;
      const filepath = path.join(armorDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(item, null, 2));
      console.log(`  Saved: ${filename} (${item.parts.length} parts)`);
      totalCount++;
    }
    
    // Save weapons
    console.log(`\nProcessing weapons (${weapons.length} items):`);
    for (const item of weapons) {
      const safeName = createSafeFileName(item.name);
      const filename = `${safeName}_${item.id}.json`;
      const filepath = path.join(weaponDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(item, null, 2));
      console.log(`  Saved: ${filename} (${item.parts.length} parts)`);
      totalCount++;
    }
    
    console.log(`\n✅ Successfully parsed and saved ${totalCount} items to ${outputDir}`);
    console.log(`Categories:`);
    console.log(`  Treasures: ${treasures.length} items`);
    console.log(`  Armor: ${armor.length} items`);
    console.log(`  Weapons: ${weapons.length} items`);
    
  } catch (error) {
    console.error('❌ Error parsing items:', error);
    process.exit(1);
  }
}

main(); 