const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

function extractCharacterStats(xmlPath, outputPath) {
  console.log(`Extracting character stats from ${xmlPath}...`);
  
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  const characterStats = {};
  
  // Find all GameObject elements
  const gameObjects = doc.getElementsByTagName('GameObject');
  
  for (let i = 0; i < gameObjects.length; i++) {
    const gameObject = gameObjects[i];
    const name = gameObject.getAttribute('name');
    
    // Check if this is a character (has character attribute)
    const thisBlock = gameObject.getElementsByTagName('AttributeBlock')[0];
    if (!thisBlock || thisBlock.getAttribute('blockName') !== 'this') continue;
    
    const attributes = thisBlock.getElementsByTagName('attribute');
    let isCharacter = false;
    for (let j = 0; j < attributes.length; j++) {
      if (attributes[j].getAttribute('character') !== null) {
        isCharacter = true;
        break;
      }
    }
    
    if (!isCharacter) continue;
    
    // This is a character, look for stats in RS_PB__ block
    const attributeBlocks = gameObject.getElementsByTagName('AttributeBlock');
    let rsBlock = null;
    for (let j = 0; j < attributeBlocks.length; j++) {
      if (attributeBlocks[j].getAttribute('blockName') === 'RS_PB__') {
        rsBlock = attributeBlocks[j];
        break;
      }
    }
    
    if (rsBlock) {
      const attributes = rsBlock.getElementsByTagName('attribute');
      let gold = 0;
      let fame = 0;
      let notoriety = 0;
      
      for (let j = 0; j < attributes.length; j++) {
        const attr = attributes[j];
        if (attr.hasAttribute('gol__')) {
          gold = parseFloat(attr.getAttribute('gol__') || '0');
        }
        if (attr.hasAttribute('fam__')) {
          fame = parseFloat(attr.getAttribute('fam__') || '0');
        }
        if (attr.hasAttribute('not__')) {
          notoriety = parseFloat(attr.getAttribute('not__') || '0');
        }
      }
      
      // Count starting spells from sspells__ attributeList
      const sspellsList = rsBlock.getElementsByTagName('attributeList');
      let startingSpells = 0;
      for (let j = 0; j < sspellsList.length; j++) {
        const attrList = sspellsList[j];
        if (attrList.getAttribute('keyName') === 'sspells__') {
          const spellVals = attrList.getElementsByTagName('attributeVal');
          startingSpells = spellVals.length;
          break;
        }
      }
      
      // Count great treasures and learned spells from inventory
      let greatTreasures = 0;
      let learnedSpells = 0;
      
      // Get all items this character contains
      const containsElements = gameObject.getElementsByTagName('contains');
      for (let j = 0; j < containsElements.length; j++) {
        const itemId = containsElements[j].getAttribute('id');
        
        // Find the item GameObject
        for (let k = 0; k < gameObjects.length; k++) {
          const itemObject = gameObjects[k];
          if (itemObject.getAttribute('id') === itemId) {
            const itemThisBlock = itemObject.getElementsByTagName('AttributeBlock')[0];
            if (itemThisBlock && itemThisBlock.getAttribute('blockName') === 'this') {
              const itemAttributes = itemThisBlock.getElementsByTagName('attribute');
              
              // Check if it's a great treasure
              for (let l = 0; l < itemAttributes.length; l++) {
                if (itemAttributes[l].hasAttribute('great')) {
                  greatTreasures++;
                  break;
                }
              }
              
              // Check if it's a learned spell (spell that's not a starting spell)
              for (let l = 0; l < itemAttributes.length; l++) {
                if (itemAttributes[l].hasAttribute('spell')) {
                  // This is a spell, but we need to check if it's learned vs starting
                  // For now, we'll count all spells as learned (this needs refinement)
                  learnedSpells++;
                  break;
                }
              }
            }
            break;
          }
        }
      }
      
      // Subtract starting spells from total spells to get learned spells only
      learnedSpells = Math.max(0, learnedSpells - startingSpells);
      
      characterStats[name] = {
        gold: Math.round(gold),
        fame: Math.round(fame),
        notoriety: Math.round(notoriety),
        startingSpells: startingSpells,
        greatTreasures: greatTreasures,
        learnedSpells: learnedSpells
      };
      
      console.log(`Found stats for ${name}: Gold=${gold}, Fame=${fame}, Notoriety=${notoriety}, GT=${greatTreasures}, LS=${learnedSpells}`);
    }
  }
  
  // Write to output file
  fs.writeFileSync(outputPath, JSON.stringify(characterStats, null, 2));
  console.log(`Character stats written to ${outputPath}`);
  
  return characterStats;
}

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.log('Usage: node extract_character_stats.js <input_xml> <output_json>');
    process.exit(1);
  }
  
  const [inputPath, outputPath] = args;
  extractCharacterStats(inputPath, outputPath);
}

module.exports = { extractCharacterStats }; 