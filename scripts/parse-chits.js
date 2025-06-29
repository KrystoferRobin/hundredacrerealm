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

// Check if a GameObject is a warning (has warning attr)
function isWarning(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'warning');
}

// Check if a GameObject is a sound (has sound attr)
function isSound(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'sound');
}

// Check if a GameObject is a treasure location (has treasure_location attr)
function isTreasureLocation(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'treasure_location');
}

// Check if a GameObject is a dwelling (has dwelling attr)
function isDwelling(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'dwelling');
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
    console.log('Parsing MagicRealmData.xml for chits...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    
    // Categorize chits
    const warnings = [];
    const sounds = [];
    const treasureLocations = [];
    const dwellings = [];
    
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      const chit = {
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
          chit.parts.push({
            id: partObj.id,
            name: partObj.name,
            attributeBlocks: partAttributeBlocks
          });
        }
      }
      
      // Categorize based on attributes
      if (isWarning(attributeBlocks)) {
        warnings.push(chit);
      } else if (isSound(attributeBlocks)) {
        sounds.push(chit);
      } else if (isTreasureLocation(attributeBlocks)) {
        treasureLocations.push(chit);
      } else if (isDwelling(attributeBlocks)) {
        dwellings.push(chit);
      }
    }
    
    // Create output directories
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'chits');
    const warningDir = path.join(outputDir, 'warning');
    const soundDir = path.join(outputDir, 'sound');
    const treasureDir = path.join(outputDir, 'treasuresites');
    const dwellingDir = path.join(outputDir, 'dwellings');
    
    [outputDir, warningDir, soundDir, treasureDir, dwellingDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Clear existing files
    [warningDir, soundDir, treasureDir, dwellingDir].forEach(dir => {
      const existingFiles = fs.readdirSync(dir);
      for (const file of existingFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    });
    
    let totalCount = 0;
    
    // Save warnings
    console.log(`\nProcessing warnings (${warnings.length} chits):`);
    for (const chit of warnings) {
      const safeName = createSafeFileName(chit.name);
      const filename = `${safeName}_${chit.id}.json`;
      const filepath = path.join(warningDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(chit, null, 2));
      console.log(`  Saved: ${filename} (${chit.parts.length} parts)`);
      totalCount++;
    }
    
    // Save sounds
    console.log(`\nProcessing sounds (${sounds.length} chits):`);
    for (const chit of sounds) {
      const safeName = createSafeFileName(chit.name);
      const filename = `${safeName}_${chit.id}.json`;
      const filepath = path.join(soundDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(chit, null, 2));
      console.log(`  Saved: ${filename} (${chit.parts.length} parts)`);
      totalCount++;
    }
    
    // Save treasure locations
    console.log(`\nProcessing treasure locations (${treasureLocations.length} chits):`);
    for (const chit of treasureLocations) {
      const safeName = createSafeFileName(chit.name);
      const filename = `${safeName}_${chit.id}.json`;
      const filepath = path.join(treasureDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(chit, null, 2));
      console.log(`  Saved: ${filename} (${chit.parts.length} parts)`);
      totalCount++;
    }
    
    // Save dwellings
    console.log(`\nProcessing dwellings (${dwellings.length} chits):`);
    for (const chit of dwellings) {
      const safeName = createSafeFileName(chit.name);
      const filename = `${safeName}_${chit.id}.json`;
      const filepath = path.join(dwellingDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(chit, null, 2));
      console.log(`  Saved: ${filename} (${chit.parts.length} parts)`);
      totalCount++;
    }
    
    console.log(`\n✅ Successfully parsed and saved ${totalCount} chits to ${outputDir}`);
    console.log(`Categories:`);
    console.log(`  Warnings: ${warnings.length} chits`);
    console.log(`  Sounds: ${sounds.length} chits`);
    console.log(`  Treasure Locations: ${treasureLocations.length} chits`);
    console.log(`  Dwellings: ${dwellings.length} chits`);
    
  } catch (error) {
    console.error('❌ Error parsing chits:', error);
    process.exit(1);
  }
}

main(); 