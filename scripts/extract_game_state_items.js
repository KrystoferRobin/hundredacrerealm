const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const extractGameStateItems = (xmlPath, itemIds, outputDir) => {
    console.log('Extracting item definitions from game state XML...');
    
    try {
        // Read the XML file
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text'
        });
        
        const xmlData = parser.parse(xmlContent);
        
        const items = [];
        
        // Find all GameObject elements
        const findGameObjects = (obj) => {
            if (typeof obj === 'object' && obj !== null) {
                if (obj.GameObject) {
                    const gameObjects = Array.isArray(obj.GameObject) ? obj.GameObject : [obj.GameObject];
                    
                    gameObjects.forEach(gameObj => {
                        const id = gameObj['@_id'];
                        if (itemIds.includes(id)) {
                            const item = {
                                id: id,
                                name: gameObj['@_name'] || `Unknown Item ${id}`,
                                attributeBlocks: {}
                            };
                            
                            // Extract attribute blocks
                            if (gameObj.AttributeBlock) {
                                const blocks = Array.isArray(gameObj.AttributeBlock) ? gameObj.AttributeBlock : [gameObj.AttributeBlock];
                                
                                blocks.forEach(block => {
                                    const blockName = block['@_blockName'];
                                    item.attributeBlocks[blockName] = {};
                                    
                                    if (block.attribute) {
                                        const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
                                        
                                        attributes.forEach(attr => {
                                            const key = Object.keys(attr)[0];
                                            const value = attr[key];
                                            
                                            if (key.startsWith('@_')) {
                                                const attrName = key.substring(2);
                                                item.attributeBlocks[blockName][attrName] = value;
                                            }
                                        });
                                    }
                                    
                                    // Handle attribute lists
                                    if (block.attributeList) {
                                        const lists = Array.isArray(block.attributeList) ? block.attributeList : [block.attributeList];
                                        
                                        lists.forEach(list => {
                                            const keyName = list['@_keyName'];
                                            item.attributeBlocks[blockName][keyName] = {};
                                            
                                            if (list.attributeVal) {
                                                const values = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                                                
                                                values.forEach(val => {
                                                    const valKey = Object.keys(val)[0];
                                                    const valValue = val[valKey];
                                                    
                                                    if (valKey.startsWith('N')) {
                                                        item.attributeBlocks[blockName][keyName][valKey] = valValue;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            
                            items.push(item);
                        }
                    });
                }
                
                // Recursively search nested objects
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        findGameObjects(value);
                    }
                }
            }
        };
        
        findGameObjects(xmlData);
        
        // Categorize items based on their attributes
        const categorizedItems = {
            treasures: [],
            armor: [],
            weapons: [],
            spells: [],
            monsters: [],
            natives: [],
            chits: [],
            unknown: []
        };
        
        items.forEach(item => {
            const thisBlock = item.attributeBlocks.this || {};
            
            if (thisBlock.treasure) {
                categorizedItems.treasures.push(item);
            } else if (thisBlock.armor) {
                categorizedItems.armor.push(item);
            } else if (thisBlock.weapon) {
                categorizedItems.weapons.push(item);
            } else if (thisBlock.spell) {
                categorizedItems.spells.push(item);
            } else if (thisBlock.monster) {
                categorizedItems.monsters.push(item);
            } else if (thisBlock.native) {
                categorizedItems.natives.push(item);
            } else if (thisBlock.chit) {
                categorizedItems.chits.push(item);
            } else {
                categorizedItems.unknown.push(item);
            }
        });
        
        // Save results
        const outputPath = path.join(outputDir, 'game_state_items.json');
        fs.writeFileSync(outputPath, JSON.stringify(categorizedItems, null, 2));
        
        // Print summary
        console.log('\nGame State Items Summary:');
        console.log(`  Treasures: ${categorizedItems.treasures.length}`);
        console.log(`  Armor: ${categorizedItems.armor.length}`);
        console.log(`  Weapons: ${categorizedItems.weapons.length}`);
        console.log(`  Spells: ${categorizedItems.spells.length}`);
        console.log(`  Monsters: ${categorizedItems.monsters.length}`);
        console.log(`  Natives: ${categorizedItems.natives.length}`);
        console.log(`  Chits: ${categorizedItems.chits.length}`);
        console.log(`  Unknown: ${categorizedItems.unknown.length}`);
        
        if (categorizedItems.treasures.length > 0) {
            console.log('\nTreasures:');
            categorizedItems.treasures.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
        }
        
        if (categorizedItems.armor.length > 0) {
            console.log('\nArmor:');
            categorizedItems.armor.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
        }
        
        if (categorizedItems.weapons.length > 0) {
            console.log('\nWeapons:');
            categorizedItems.weapons.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
        }
        
        if (categorizedItems.spells.length > 0) {
            console.log('\nSpells:');
            categorizedItems.spells.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
        }
        
        if (categorizedItems.unknown.length > 0) {
            console.log('\nUnknown Items:');
            categorizedItems.unknown.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
        }
        
        return categorizedItems;
        
    } catch (error) {
        console.error(`Error extracting game state items: ${error.message}`);
        throw error;
    }
};

// Test the extractor
if (require.main === module) {
    const xmlPath = path.join(__dirname, '../parsed_sessions/learning-woodsgirl/extracted_game.xml');
    const itemIds = ['165', '3360', '334', '379', '351', '330', '324', '327', '340', '238', '133'];
    const outputDir = path.join(__dirname, '../parsed_sessions/learning-woodsgirl');
    
    if (fs.existsSync(xmlPath)) {
        try {
            const items = extractGameStateItems(xmlPath, itemIds, outputDir);
        } catch (error) {
            console.error('Failed to extract game state items:', error.message);
        }
    } else {
        console.error(`XML file not found: ${xmlPath}`);
    }
}

module.exports = { extractGameStateItems }; 