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

// Check if a GameObject is a spell (has spell attr)
function isSpell(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'spell');
}

// Get spell level from attribute blocks
function getSpellLevel(attributeBlocks) {
  if (attributeBlocks.this && attributeBlocks.this.spell) {
    return attributeBlocks.this.spell;
  }
  return null;
}

// Check if a GameObject should be excluded
function shouldExclude(name) {
  return name === 'Test Boon Card';
}

// Create safe filename
function createSafeFileName(name) {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

// Create safe folder name
function createSafeFolderName(spellLevel) {
  if (spellLevel === '*') {
    return 'special';
  }
  return spellLevel.replace(/[^a-zA-Z0-9]/g, '');
}

function main() {
  try {
    console.log('Parsing MagicRealmData.xml for spells...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const gameObjects = parseGameObjects(xmlContent);
    
    // Categorize spells by level
    const spellsByLevel = new Map();
    
    for (const [id, obj] of gameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      if (isSpell(attributeBlocks)) {
        const spellLevel = getSpellLevel(attributeBlocks);
        if (spellLevel) {
          const spell = {
            id,
            name: obj.name,
            spellLevel,
            attributeBlocks,
            parts: []
          };
          
          // Find all contained ids and add their parsed data as parts
          const containedIdsInThis = findContainedIds(obj.content);
          for (const partId of containedIdsInThis) {
            if (gameObjects.has(partId)) {
              const partObj = gameObjects.get(partId);
              const partAttributeBlocks = parseAttributeBlocks(partObj.content);
              spell.parts.push({
                id: partObj.id,
                name: partObj.name,
                attributeBlocks: partAttributeBlocks
              });
            }
          }
          
          // Group by spell level
          if (!spellsByLevel.has(spellLevel)) {
            spellsByLevel.set(spellLevel, []);
          }
          spellsByLevel.get(spellLevel).push(spell);
        }
      }
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'spells');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Clear existing files
    if (fs.existsSync(outputDir)) {
      const existingFiles = fs.readdirSync(outputDir);
      for (const file of existingFiles) {
        const filePath = path.join(outputDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      }
    }
    
    let totalCount = 0;
    
    // Process each spell level
    for (const [spellLevel, spells] of spellsByLevel) {
      const safeFolderName = createSafeFolderName(spellLevel);
      const levelDir = path.join(outputDir, safeFolderName);
      
      if (!fs.existsSync(levelDir)) {
        fs.mkdirSync(levelDir, { recursive: true });
      }
      
      console.log(`\nProcessing spell level ${spellLevel} (${spells.length} spells):`);
      for (const spell of spells) {
        const safeName = createSafeFileName(spell.name);
        const filename = `${safeName}_${spell.id}.json`;
        const filepath = path.join(levelDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(spell, null, 2));
        console.log(`  Saved: ${filename} (${spell.parts.length} parts)`);
        totalCount++;
      }
    }
    
    console.log(`\n✅ Successfully parsed and saved ${totalCount} spells to ${outputDir}`);
    console.log(`Spell levels found:`);
    for (const [spellLevel, spells] of spellsByLevel) {
      console.log(`  Level ${spellLevel}: ${spells.length} spells`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing spells:', error);
    process.exit(1);
  }
}

main(); 