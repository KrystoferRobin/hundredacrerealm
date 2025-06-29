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

// Check if a GameObject is a native (has native attr, no monster attr, no treasure attr, no spell attr)
function isNative(attributeBlocks) {
  return (
    attributeBlocks.this &&
    Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'native') &&
    !Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'monster') &&
    !Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'treasure') &&
    !Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'spell')
  );
}

// Check if a GameObject is a part (has part attr)
function isPart(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'part');
}

// Check if a GameObject is a horse/pony (has horse attr)
function isHorse(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'horse');
}

// Check if a GameObject is a dwelling container (has dwelling attr or is a dwelling container)
function isDwellingContainer(attributeBlocks, name) {
  return (
    (attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'dwelling')) ||
    name.toLowerCase().includes('dwelling')
  );
}

// Check if a GameObject should be excluded (like Test_Boon_Card)
function shouldExclude(name) {
  return name === 'Test Boon Card';
}

// Get dwelling name from setup_start attribute, or return null
function getDwellingName(attributeBlocks) {
  if (attributeBlocks.this && attributeBlocks.this.setup_start) {
    return attributeBlocks.this.setup_start;
  }
  return null;
}

// Create safe directory name
function createSafeDirName(name) {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

function main() {
  try {
    console.log('Parsing MagicRealmData.xml for natives and their parts...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    
    // First pass: identify all contained entities
    const containedIds = new Set();
    for (const [id, obj] of gameObjects) {
      const containedIdsInThis = findContainedIds(obj.content);
      for (const containedId of containedIdsInThis) {
        containedIds.add(containedId);
      }
    }
    
    // Group natives by dwelling
    const nativesByDwelling = new Map();
    const ungroupedNatives = [];
    
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      // Skip horses/ponies that are contained by other natives
      if (isHorse(attributeBlocks) && containedIds.has(id)) {
        continue;
      }
      
      if (isNative(attributeBlocks) && !isPart(attributeBlocks) && !isDwellingContainer(attributeBlocks, obj.name)) {
        // Main native (not a dwelling container)
        const native = {
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
            
            // Only include as part if it's a horse/pony or has a part attribute
            if (isHorse(partAttributeBlocks) || isPart(partAttributeBlocks)) {
              native.parts.push({
                id: partObj.id,
                name: partObj.name,
                attributeBlocks: partAttributeBlocks
              });
            }
          }
        }
        
        // Determine dwelling
        const dwellingName = getDwellingName(attributeBlocks);
        if (dwellingName) {
          if (!nativesByDwelling.has(dwellingName)) {
            nativesByDwelling.set(dwellingName, []);
          }
          nativesByDwelling.get(dwellingName).push(native);
        } else {
          ungroupedNatives.push(native);
        }
      }
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'natives');
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
    
    let totalCount = 0;
    
    // Save natives by dwelling
    for (const [dwellingName, natives] of nativesByDwelling) {
      const dwellingDir = path.join(outputDir, createSafeDirName(dwellingName));
      if (!fs.existsSync(dwellingDir)) {
        fs.mkdirSync(dwellingDir, { recursive: true });
      }
      
      console.log(`\nProcessing dwelling: ${dwellingName} (${natives.length} natives)`);
      
      for (const native of natives) {
        const safeName = native.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `${safeName}_${native.id}.json`;
        const filepath = path.join(dwellingDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(native, null, 2));
        console.log(`  Saved: ${filename} (${native.parts.length} parts)`);
        totalCount++;
      }
    }
    
    // Save ungrouped natives
    if (ungroupedNatives.length > 0) {
      console.log(`\nProcessing ungrouped natives (${ungroupedNatives.length} natives):`);
      for (const native of ungroupedNatives) {
        const safeName = native.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `${safeName}_${native.id}.json`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(native, null, 2));
        console.log(`  Saved: ${filename} (${native.parts.length} parts)`);
        totalCount++;
      }
    }
    
    console.log(`\n✅ Successfully parsed and saved ${totalCount} natives to ${outputDir}`);
    console.log(`Found ${nativesByDwelling.size} dwellings:`);
    for (const [dwellingName, natives] of nativesByDwelling) {
      console.log(`  ${dwellingName}: ${natives.length} natives`);
    }
    if (ungroupedNatives.length > 0) {
      console.log(`  Ungrouped: ${ungroupedNatives.length} natives`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing natives:', error);
    process.exit(1);
  }
}

main(); 