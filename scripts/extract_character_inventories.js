const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Helper to resolve paths for Docker or local
function resolveAppPath(subPath) {
  if (process.env.IS_DOCKER === '1') {
    return `/app/${subPath}`;
  }
  return require('path').join(__dirname, '..', subPath);
}

// Function to find file by name in directory (recursive)
function findFileByName(dir, itemName) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively search subdirectories
        const found = findFileByName(filePath, itemName);
        if (found) return found;
      } else if (stat.isFile() && file.endsWith('.json')) {
        // Check if filename contains the item name (case insensitive)
        const fileName = path.basename(file, '.json');
        if (fileName.toLowerCase().includes(itemName.toLowerCase().replace(/\s+/g, '_'))) {
          return filePath;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Function to get item data from coregamedata
function getItemData(itemName) {
  try {
    // Search in weapon directory
    const weaponDir = resolveAppPath('coregamedata/items/weapon');
    const weaponPath = findFileByName(weaponDir, itemName);
    if (weaponPath) {
      return { type: 'weapon', data: JSON.parse(fs.readFileSync(weaponPath, 'utf8')) };
    }
    
    // Search in armor directory
    const armorDir = resolveAppPath('coregamedata/items/armor');
    const armorPath = findFileByName(armorDir, itemName);
    if (armorPath) {
      return { type: 'armor', data: JSON.parse(fs.readFileSync(armorPath, 'utf8')) };
    }
    
    // Search in treasure directory
    const treasureDir = resolveAppPath('coregamedata/items/treasure');
    const treasurePath = findFileByName(treasureDir, itemName);
    if (treasurePath) {
      return { type: 'treasure', data: JSON.parse(fs.readFileSync(treasurePath, 'utf8')) };
    }
    
    return null;
  } catch (error) {
    console.error(`Error reading item ${itemName}:`, error);
    return null;
  }
}

// Function to get spell data from coregamedata
function getSpellData(spellName) {
  try {
    const spellsDir = resolveAppPath('coregamedata/spells');
    const spellPath = findFileByName(spellsDir, spellName);
    if (spellPath) {
      // Extract level from path
      const level = path.basename(path.dirname(spellPath));
      return { type: 'spell', level: level, data: JSON.parse(fs.readFileSync(spellPath, 'utf8')) };
    }
    
    return null;
  } catch (error) {
    console.error(`Error reading spell ${spellName}:`, error);
    return null;
  }
}

// Function to get native data from coregamedata
function getNativeData(nativeName) {
  try {
    const nativesDir = resolveAppPath('coregamedata/natives');
    const nativePath = findFileByName(nativesDir, nativeName);
    if (nativePath) {
      // Extract dwelling type from path
      const dwellingType = path.basename(path.dirname(nativePath));
      return { type: 'native', dwelling: dwellingType, data: JSON.parse(fs.readFileSync(nativePath, 'utf8')) };
    }
    
    return null;
  } catch (error) {
    console.error(`Error reading native ${nativeName}:`, error);
    return null;
  }
}

// Function to categorize items
function categorizeItem(itemData) {
  if (!itemData) return 'unknown';
  
  const { type, data } = itemData;
  
  if (type === 'treasure') {
    const treasureType = data.attributeBlocks?.this?.treasure;
    if (treasureType === 'large') {
      return 'great_treasure';
    } else if (treasureType === 'small') {
      return 'treasure';
    }
  }
  
  if (type === 'weapon') return 'weapon';
  if (type === 'armor') return 'armor';
  if (type === 'spell') return 'spell';
  if (type === 'native') return 'native';
  
  return 'other';
}

// Main extraction function
function extractCharacterInventories(
  sessionId = null,
  xmlPath = 'extracted_game.xml',
  sessionPath = 'parsed_session.json',
  outputPath = 'character_inventories.json'
) {
  // If sessionId is provided, use legacy mode (for manual use)
  if (sessionId && sessionId !== 'extracted_game.xml') {
    xmlPath = path.join('public', 'parsed_sessions', sessionId, 'extracted_game.xml');
    sessionPath = path.join('public', 'parsed_sessions', sessionId, 'parsed_session.json');
    outputPath = path.join('public', 'parsed_sessions', sessionId, 'character_inventories.json');
  }
  
  if (!fs.existsSync(xmlPath)) {
    console.error('XML file not found:', xmlPath);
    process.exit(1);
  }
  if (!fs.existsSync(sessionPath)) {
    console.error('Parsed session file not found:', sessionPath);
    process.exit(1);
  }
  
  const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  const playedCharacters = Object.keys(sessionData.characterToPlayer || {});
  
  console.log(`Characters played in this session: ${playedCharacters.join(', ')}`);
  
  console.log(`Extracting character inventories for session: ${sessionId || 'current'}`);
  
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const parser = new xml2js.Parser();
  
  parser.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return;
    }
    
    const gameObjects = result.game.objects[0].GameObject || [];
    // Build id-to-name map
    const idToName = {};
    // Build set of chit IDs
    const chitIds = new Set();
    for (const obj of gameObjects) {
      if (obj.$ && obj.$.id && obj.$.name) {
        idToName[obj.$.id] = obj.$.name;
      }
      // Check for character chits
      if (obj.AttributeBlock) {
        for (const block of obj.AttributeBlock) {
          if (block.attribute) {
            for (const attr of block.attribute) {
              if (attr.$ && Object.keys(attr.$).includes('character_chit')) {
                chitIds.add(obj.$.id);
              }
            }
          }
        }
      }
    }
    
    const characterInventories = {};
    
    // Find character objects (those with character attribute in 'this' block)
    const characters = gameObjects.filter(obj => {
      const thisBlock = obj.AttributeBlock?.find(block => block.$.blockName === 'this');
      if (!thisBlock) return false;
      const attrs = thisBlock.attribute || [];
      return attrs.some(attr => attr.$ && Object.keys(attr.$).includes('character'));
    });
    
    console.log(`Found ${characters.length} characters`);
    
    for (const character of characters) {
      const characterName = character.$.name;
      if (!characterName) continue;
      
      // Only process characters that were actually played in this session
      if (!playedCharacters.includes(characterName)) {
        continue;
      }
      
      console.log(`Processing character: ${characterName}`);
      
      // Get contained items
      const contains = character.contains || [];
      // If this character already has an inventory, accumulate; otherwise, create new
      let inventory = characterInventories[characterName];
      if (!inventory) {
        inventory = {
          character: characterName,
          items: {
            weapons: [],
            armor: [],
            treasures: [],
            great_treasures: [],
            spells: [],
            natives: [],
            other: [],
            unknown: []
          },
          raw_contains: []
        };
      }
      
      // Process each contained item
      for (const contain of contains) {
        const itemId = contain.$.id;
        // Skip chits
        if (chitIds.has(itemId)) continue;
        const itemName = idToName[itemId] || itemId;
        
        console.log(`  Found item for ${characterName}: ${itemName} (ID: ${itemId})`);
        
        // Try to get item data by name
        let itemData = getItemData(itemName);
        if (!itemData) {
          itemData = getSpellData(itemName);
        }
        if (!itemData) {
          itemData = getNativeData(itemName);
        }
        
        if (itemData) {
          const category = categorizeItem(itemData);
          const itemInfo = {
            id: itemId,
            name: itemName,
            type: itemData.type,
            category: category,
            data: itemData.data
          };
          if (inventory.items[category]) {
            inventory.items[category].push(itemInfo);
          } else {
            inventory.items.other.push(itemInfo); // fallback for any unexpected category
          }
        } else {
          // Unknown item
          inventory.items.other.push({
            id: itemId,
            name: itemName,
            type: 'unknown',
            category: 'other'
          });
        }
        inventory.raw_contains.push(itemId);
      }
      
      characterInventories[characterName] = inventory;
    }
    
    // Save to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(characterInventories, null, 2));
    console.log(`Character inventories saved to: ${outputPath}`);
    
    // Print summary
    console.log('\nCharacter Inventory Summary:');
    Object.entries(characterInventories).forEach(([name, inventory]) => {
      const totalItems = Object.values(inventory.items).reduce((sum, items) => sum + items.length, 0);
      console.log(`${name}: ${totalItems} items`);
      Object.entries(inventory.items).forEach(([category, items]) => {
        if (items.length > 0) {
          console.log(`  ${category}: ${items.length} (${items.map(i => i.name).join(', ')})`);
        }
      });
    });
  });
}

// Run extraction if called directly
if (require.main === module) {
  const arg = process.argv[2];
  extractCharacterInventories(arg);
}

module.exports = { extractCharacterInventories }; 