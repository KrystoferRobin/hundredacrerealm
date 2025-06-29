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

// Check if a GameObject is a monster (has monster attr, no native attr)
function isMonster(attributeBlocks) {
  return (
    attributeBlocks.this &&
    Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'monster') &&
    !Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'native')
  );
}

// Check if a GameObject is a part (has part attr)
function isPart(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'part');
}

function main() {
  try {
    console.log('Parsing MagicRealmData.xml for monsters and their parts...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'monsters');
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
    let count = 0;
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      if (isMonster(attributeBlocks) && !isPart(attributeBlocks)) {
        // Main monster
        const monster = {
          id,
          name: obj.name,
          attributeBlocks,
          parts: []
        };
        // Find all contained ids and add their parsed data as parts
        const containedIds = findContainedIds(obj.content);
        for (const partId of containedIds) {
          if (gameObjects.has(partId)) {
            const partObj = gameObjects.get(partId);
            const partAttributeBlocks = parseAttributeBlocks(partObj.content);
            monster.parts.push({
              id: partObj.id,
              name: partObj.name,
              attributeBlocks: partAttributeBlocks
            });
          }
        }
        // Save to JSON
        const safeName = monster.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `${safeName}.json`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(monster, null, 2));
        console.log(`Saved: ${filename} (${monster.parts.length} parts)`);
        count++;
      }
    }
    console.log(`\n✅ Successfully parsed and saved ${count} monsters to ${outputDir}`);
  } catch (error) {
    console.error('❌ Error parsing monsters:', error);
    process.exit(1);
  }
}

main(); 