const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const AdmZip = require('adm-zip');

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
    
    // Parse regular attributes
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
    
    // Parse attributeList elements
    const attrListRegex = /<attributeList[^>]*keyName="([^"]*)"[^>]*>([\s\S]*?)<\/attributeList>/g;
    let attrListMatch;
    while ((attrListMatch = attrListRegex.exec(blockContent)) !== null) {
      const listKey = attrListMatch[1];
      const listContent = attrListMatch[2];
      const listValues = {};
      
      const attrValRegex = /<attributeVal\s+([^>]*)\/>/g;
      let attrValMatch;
      while ((attrValMatch = attrValRegex.exec(listContent)) !== null) {
        const attrValString = attrValMatch[1];
        const attrValNameMatch = attrValString.match(/(\w+)="([^"]*)"/);
        if (attrValNameMatch) {
          const attrValName = attrValNameMatch[1];
          const attrValValue = attrValNameMatch[2];
          listValues[attrValName] = attrValValue;
        }
      }
      
      attributes[listKey] = listValues;
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

// Check if a GameObject is a character (has character attr)
function isCharacter(attributeBlocks) {
  return attributeBlocks.this && Object.prototype.hasOwnProperty.call(attributeBlocks.this, 'character');
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
function createSafeFolderName(name) {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
}

// Extract XML content from .rschar ZIP file
function extractRscharFile(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // Look for XML files in the ZIP
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.xml') || entry.entryName.includes('xml')) {
        const xmlContent = entry.getData().toString('utf8');
        return xmlContent;
      }
    }
    
    // If no XML file found, try to find any file that might contain XML
    for (const entry of zipEntries) {
      const content = entry.getData().toString('utf8');
      if (content.includes('<GameObject') || content.includes('<?xml')) {
        return content;
      }
    }
    
    console.error(`No XML content found in ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error extracting ${filePath}:`, error.message);
    return null;
  }
}

function main() {
  try {
    console.log('Parsing MagicRealmData.xml for characters...');
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    const xmlGameObjects = parseGameObjects(xmlContent);
    
    // Collect characters from XML, combining duplicates by name
    const xmlCharacters = new Map(); // name -> character object
    
    for (const [id, obj] of xmlGameObjects) {
      const attributeBlocks = parseAttributeBlocks(obj.content);
      
      // Skip excluded items
      if (shouldExclude(obj.name)) {
        continue;
      }
      
      if (isCharacter(attributeBlocks)) {
        if (xmlCharacters.has(obj.name)) {
          // Combine with existing character, add this ID to the list
          const existingChar = xmlCharacters.get(obj.name);
          existingChar.ids.push(id);
        } else {
          // Create new character
          const character = {
            ids: [id],
            name: obj.name,
            attributeBlocks,
            parts: []
          };
          
          // Find all contained ids and add their parsed data as parts
          const containedIdsInThis = findContainedIds(obj.content);
          for (const partId of containedIdsInThis) {
            if (xmlGameObjects.has(partId)) {
              const partObj = xmlGameObjects.get(partId);
              const partAttributeBlocks = parseAttributeBlocks(partObj.content);
              character.parts.push({
                id: partObj.id,
                name: partObj.name,
                attributeBlocks: partAttributeBlocks
              });
            }
          }
          
          xmlCharacters.set(obj.name, character);
        }
      }
    }
    
    // Process .rschar files as unique characters
    const rscharCharacters = [];
    const charactersDir = path.join(__dirname, '..', 'characters');
    if (fs.existsSync(charactersDir)) {
      console.log('Parsing .rschar files from characters directory...');
      const rscharFiles = fs.readdirSync(charactersDir).filter(file => file.endsWith('.rschar'));
      
      for (const rscharFile of rscharFiles) {
        const rscharPath = path.join(charactersDir, rscharFile);
        console.log(`  Processing: ${rscharFile}`);
        
        const extractedContent = extractRscharFile(rscharPath);
        if (extractedContent) {
          const rscharGameObjects = parseGameObjects(extractedContent);
          
          // Each .rschar should contain exactly one character
          for (const [id, obj] of rscharGameObjects) {
            const attributeBlocks = parseAttributeBlocks(obj.content);
            
            if (isCharacter(attributeBlocks)) {
              const character = {
                ids: [id],
                name: obj.name,
                attributeBlocks,
                parts: [],
                source: 'rschar'
              };
              
              // Find all contained ids and add their parsed data as parts
              const containedIdsInThis = findContainedIds(obj.content);
              for (const partId of containedIdsInThis) {
                if (rscharGameObjects.has(partId)) {
                  const partObj = rscharGameObjects.get(partId);
                  const partAttributeBlocks = parseAttributeBlocks(partObj.content);
                  character.parts.push({
                    id: partObj.id,
                    name: partObj.name,
                    attributeBlocks: partAttributeBlocks
                  });
                }
              }
              
              rscharCharacters.push(character);
              break; // Only take the first character from each .rschar
            }
          }
        }
      }
    }
    
    // Combine all characters
    const allCharacters = [];
    
    // Add XML characters
    for (const character of xmlCharacters.values()) {
      character.source = 'xml';
      allCharacters.push(character);
    }
    
    // Add .rschar characters
    allCharacters.push(...rscharCharacters);
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', 'coregamedata', 'characters');
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
    
    console.log(`\nProcessing characters (${allCharacters.length} characters):`);
    for (const character of allCharacters) {
      const safeFolderName = createSafeFolderName(character.name);
      const characterDir = path.join(outputDir, safeFolderName);
      
      if (!fs.existsSync(characterDir)) {
        fs.mkdirSync(characterDir, { recursive: true });
      }
      
      // Save main character file
      const characterFilename = `${safeFolderName}.json`;
      const characterFilepath = path.join(characterDir, characterFilename);
      fs.writeFileSync(characterFilepath, JSON.stringify(character, null, 2));
      console.log(`  Saved: ${characterFilename} (${character.parts.length} parts, IDs: ${character.ids.join(', ')})`);
      
      // Save each part as a separate JSON file
      for (const part of character.parts) {
        const safePartName = createSafeFileName(part.name);
        const partFilename = `${safePartName}_${part.id}.json`;
        const partFilepath = path.join(characterDir, partFilename);
        fs.writeFileSync(partFilepath, JSON.stringify(part, null, 2));
        console.log(`    Part: ${partFilename}`);
      }
    }
    
    console.log(`\n✅ Successfully parsed and saved ${allCharacters.length} characters to ${outputDir}`);
    
    // Show some statistics about characters
    let totalParts = 0;
    for (const character of allCharacters) {
      totalParts += character.parts.length;
    }
    console.log(`Total character parts: ${totalParts}`);
    
    // Show character names and sources
    console.log(`\nCharacters found:`);
    for (const character of allCharacters) {
      console.log(`  ${character.name} (${character.parts.length} parts, ${character.ids.length} IDs, source: ${character.source})`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing characters:', error);
    process.exit(1);
  }
}

main(); 