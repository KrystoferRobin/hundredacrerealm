const fs = require('fs');
const path = require('path');

// Function to parse XML content and extract monsters
function parseMonsters(xmlContent) {
  const monsters = new Map(); // Use Map to handle monster parts
  const monsterParts = new Map(); // Store parts separately first
  
  // First pass: collect all GameObjects
  const gameObjectRegex = /<GameObject[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/GameObject>/g;
  
  let match;
  while ((match = gameObjectRegex.exec(xmlContent)) !== null) {
    const id = match[1];
    const name = match[2];
    const content = match[3];
    
    // Check if this is a monster (has monster attribute, no native attribute)
    const hasMonsterAttr = /<attribute monster=""[^>]*>/i.test(content);
    const hasNativeAttr = /<attribute native=""[^>]*>/i.test(content);
    
    if (hasMonsterAttr && !hasNativeAttr) {
      // Parse all attribute blocks
      const attributeBlocks = {};
      const blockRegex = /<AttributeBlock[^>]*blockName="([^"]*)"[^>]*>([\s\S]*?)<\/AttributeBlock>/g;
      
      let blockMatch;
      while ((blockMatch = blockRegex.exec(content)) !== null) {
        const blockName = blockMatch[1];
        const blockContent = blockMatch[2];
        
        // Parse attributes within this block
        const attributes = {};
        const attrRegex = /<attribute\s+([^>]*)\/>/g;
        
        let attrMatch;
        while ((attrMatch = attrRegex.exec(blockContent)) !== null) {
          const attrString = attrMatch[1];
          
          // Parse attribute name and value
          const attrNameMatch = attrString.match(/(\w+)="([^"]*)"/);
          if (attrNameMatch) {
            const attrName = attrNameMatch[1];
            const attrValue = attrNameMatch[2];
            attributes[attrName] = attrValue;
          }
        }
        
        attributeBlocks[blockName] = attributes;
      }
      
      // Check if this is a monster part (has 'part' attribute)
      const isPart = attributeBlocks.this && attributeBlocks.this.part !== undefined;
      
      if (isPart) {
        // This is a monster part, store it for later association
        monsterParts.set(id, {
          id,
          name,
          attributeBlocks,
          content
        });
        console.log(`Found part: ${name} (ID: ${id})`);
      } else {
        // This is a main monster
        const monsterData = {
          id,
          name,
          attributeBlocks,
          parts: []
        };
        
        monsters.set(id, monsterData);
        console.log(`Found monster: ${name} (ID: ${id})`);
      }
    }
  }
  
  console.log(`\nTotal monsters: ${monsters.size}`);
  console.log(`Total parts: ${monsterParts.size}`);
  
  // Second pass: associate parts with their parent monsters
  console.log('\nAssociating parts with parents...');
  for (const [partId, partData] of monsterParts) {
    // Look for contains reference in the part's content
    const containsMatch = partData.content.match(/<contains id="([^"]*)"[^>]*>/);
    if (containsMatch) {
      const parentId = containsMatch[1];
      console.log(`Part ${partData.name} (${partId}) -> Parent ID: ${parentId}`);
      if (monsters.has(parentId)) {
        monsters.get(parentId).parts.push({
          id: partData.id,
          name: partData.name,
          attributeBlocks: partData.attributeBlocks
        });
        console.log(`  ✓ Associated with ${monsters.get(parentId).name}`);
      } else {
        console.log(`  ✗ Parent not found!`);
      }
    } else {
      console.log(`Part ${partData.name} (${partId}) -> No contains reference found`);
    }
  }
  
  return monsters;
}

// Main execution
function main() {
  try {
    console.log('Debugging monster parts...');
    
    // Read the XML file
    const xmlPath = path.join(__dirname, '..', 'MagicRealmData.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    
    // Parse monsters
    const monsters = parseMonsters(xmlContent);
    
    // Show summary
    console.log('\n=== SUMMARY ===');
    let totalParts = 0;
    for (const [id, monsterData] of monsters) {
      if (monsterData.parts.length > 0) {
        console.log(`${monsterData.name}: ${monsterData.parts.length} parts`);
        totalParts += monsterData.parts.length;
      }
    }
    console.log(`Total parts associated: ${totalParts}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 