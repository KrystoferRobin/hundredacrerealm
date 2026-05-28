const fs = require('fs');
const xml2js = require('xml2js');

function parseNotebookDates(notebookBlock) {
    // Returns a map: { 'month_1_day_4': { note: 'Vault 3, and Smoke M', event: 'Clues' }, ... }
    const dateToNote = {};
    if (notebookBlock && notebookBlock.attribute) {
        for (let i = 0; i < 20; i++) {
            // Look for attributes that have date{i}, note{i}, and event{i} as keys in their $ object
            const date = notebookBlock.attribute.find(attr => attr.$[`date${i}`]);
            const note = notebookBlock.attribute.find(attr => attr.$[`note${i}`]);
            const event = notebookBlock.attribute.find(attr => attr.$[`event${i}`]);
            
            if (date && note) {
                // The values are stored directly in the $ object
                const dateVal = date.$[`date${i}`];
                const noteVal = note.$[`note${i}`];
                const eventVal = event ? event.$[`event${i}`] : 'Unknown';
                
                if (dateVal && noteVal) {
                    const dateMatch = dateVal.match(/(\d+):(\d+)/);
                    if (dateMatch) {
                        const key = `month_${dateMatch[1]}_day_${dateMatch[2]}`;
                        dateToNote[key] = { note: noteVal, event: eventVal };
                    }
                }
            }
        }
    }
    return dateToNote;
}

function getDayActions(rsBlock, dayKey) {
    // Get actions for a specific day from the RS_PB__ block
    const dayList = rsBlock.attributeList.find(list => list.$.keyName === dayKey);
    if (!dayList || !dayList.attributeVal) return [];
    
    return dayList.attributeVal.map(val => {
        // Extract the value from the $ object (N0, N1, N2, etc.)
        const keys = Object.keys(val.$);
        return keys.length > 0 ? val.$[keys[0]] : null;
    }).filter(Boolean);
}

function findItemInCharacter(woodsGirl, itemName) {
    // Search through all AttributeBlock elements for the item
    const foundItems = [];
    
    (woodsGirl.AttributeBlock || []).forEach(block => {
        if (block.attribute) {
            block.attribute.forEach(attr => {
                // Check if any attribute contains the item name
                Object.entries(attr.$).forEach(([key, value]) => {
                    if (typeof value === 'string' && value.toLowerCase().includes(itemName.toLowerCase())) {
                        foundItems.push({
                            block: block.$.blockName,
                            attribute: key,
                            value: value
                        });
                    }
                });
            });
        }
    });
    
    // Also check the contains array for items
    if (woodsGirl.contains) {
        woodsGirl.contains.forEach(contained => {
            if (contained.$.name && contained.$.name.toLowerCase().includes(itemName.toLowerCase())) {
                foundItems.push({
                    block: 'contains',
                    attribute: 'name',
                    value: contained.$.name
                });
            }
        });
    }
    
    return foundItems;
}

function findItemInGameData(gameData, itemName) {
    // Search through all GameObjects for the item
    const foundItems = [];
    
    gameData.forEach(obj => {
        // Check the object name
        if (obj.$.name && obj.$.name.toLowerCase().includes(itemName.toLowerCase())) {
            foundItems.push({
                type: 'GameObject',
                name: obj.$.name,
                location: 'main object'
            });
        }
        
        // Check AttributeBlock attributes
        (obj.AttributeBlock || []).forEach(block => {
            if (block.attribute) {
                block.attribute.forEach(attr => {
                    Object.entries(attr.$).forEach(([key, value]) => {
                        if (typeof value === 'string' && value.toLowerCase().includes(itemName.toLowerCase())) {
                            foundItems.push({
                                type: 'GameObject',
                                name: obj.$.name,
                                block: block.$.blockName,
                                attribute: key,
                                value: value
                            });
                        }
                    });
                });
            }
        });
        
        // Check contains
        (obj.contains || []).forEach(contained => {
            if (contained.$.name && contained.$.name.toLowerCase().includes(itemName.toLowerCase())) {
                foundItems.push({
                    type: 'GameObject',
                    name: obj.$.name,
                    location: 'contains',
                    itemName: contained.$.name
                });
            }
        });
    });
    
    return foundItems;
}

function findTreasureSites(gameData) {
    // Look for treasure sites, vaults, lairs, etc.
    const treasureSites = [];
    
    gameData.forEach(obj => {
        const name = obj.$.name || '';
        const lowerName = name.toLowerCase();
        
        // Check if it's a treasure site
        if (lowerName.includes('vault') || 
            lowerName.includes('lair') || 
            lowerName.includes('crypt') || 
            lowerName.includes('altar') || 
            lowerName.includes('shrine') || 
            lowerName.includes('pool') || 
            lowerName.includes('cairns') || 
            lowerName.includes('toadstool') ||
            lowerName.includes('statue') ||
            lowerName.includes('flutter') ||
            lowerName.includes('patter') ||
            lowerName.includes('howl') ||
            lowerName.includes('slither') ||
            lowerName.includes('lost city')) {
            
            const containedItems = [];
            if (obj.contains) {
                obj.contains.forEach(contained => {
                    if (contained.$.name) {
                        containedItems.push(contained.$.name);
                    }
                });
            }
            
            treasureSites.push({
                name: name,
                type: 'treasure_site',
                contains: containedItems
            });
        }
    });
    
    return treasureSites;
}

function findTreasureItems(gameData) {
    // Look for actual treasure items
    const treasureItems = [];
    
    gameData.forEach(obj => {
        const name = obj.$.name || '';
        const lowerName = name.toLowerCase();
        
        // Check if it's a treasure item
        if (lowerName.includes('treasure') || 
            lowerName.includes('gold') || 
            lowerName.includes('jewel') || 
            lowerName.includes('gem') || 
            lowerName.includes('crown') || 
            lowerName.includes('sword') || 
            lowerName.includes('armor') || 
            lowerName.includes('boots') || 
            lowerName.includes('grease') || 
            lowerName.includes('mixture') || 
            lowerName.includes('ball') ||
            lowerName.includes('draught') ||
            lowerName.includes('shoes')) {
            
            treasureItems.push({
                name: name,
                type: 'treasure_item',
                location: 'GameObject'
            });
        }
    });
    
    return treasureItems;
}

function findLootActions(rsBlock, dayKey) {
    // Look for loot-related actions in a specific day
    const actions = getDayActions(rsBlock, dayKey);
    const lootActions = actions.filter(action => 
        action.toLowerCase().includes('loot') || 
        action.toLowerCase().includes('found') || 
        action.toLowerCase().includes('treasure') ||
        action.toLowerCase().includes('gold') ||
        action.toLowerCase().includes('jewel') ||
        action.toLowerCase().includes('vault') ||
        action.toLowerCase().includes('lair') ||
        action.toLowerCase().includes('crypt') ||
        action.toLowerCase().includes('altar') ||
        action.toLowerCase().includes('shrine') ||
        action.toLowerCase().includes('pool') ||
        action.toLowerCase().includes('cairns') ||
        action.toLowerCase().includes('statue')
    );
    return lootActions;
}

function findTreasureActions(rsBlock, dayKey) {
    // Look for actions that might indicate treasure discovery
    const actions = getDayActions(rsBlock, dayKey);
    const treasureActions = [];
    
    actions.forEach(action => {
        // Look for actions that might indicate treasure sites or loot
        if (action.includes('V') || // Vault
            action.includes('L') || // Lair
            action.includes('C') || // Crypt
            action.includes('A') || // Altar
            action.includes('S') || // Shrine/Statue
            action.includes('P') || // Pool
            action.includes('T')) { // Toadstool/Cairns
            treasureActions.push(action);
        }
    });
    
    return treasureActions;
}

function findWoodsGirlInventory(woodsGirl) {
    // Look for Woods Girl's current inventory/possessions
    const inventory = [];
    
    // Check contains array
    if (woodsGirl.contains) {
        woodsGirl.contains.forEach(contained => {
            if (contained.$.name) {
                inventory.push({
                    type: 'contained',
                    name: contained.$.name
                });
            }
        });
    }
    
    // Check all AttributeBlock elements for inventory-like data
    (woodsGirl.AttributeBlock || []).forEach(block => {
        if (block.attribute) {
            block.attribute.forEach(attr => {
                Object.entries(attr.$).forEach(([key, value]) => {
                    // Look for attributes that might indicate possessions
                    if (typeof value === 'string' && 
                        (value.toLowerCase().includes('treasure') ||
                         value.toLowerCase().includes('gold') ||
                         value.toLowerCase().includes('jewel') ||
                         value.toLowerCase().includes('sword') ||
                         value.toLowerCase().includes('armor') ||
                         value.toLowerCase().includes('boots') ||
                         value.toLowerCase().includes('grease') ||
                         value.toLowerCase().includes('mixture') ||
                         value.toLowerCase().includes('ball') ||
                         value.toLowerCase().includes('draught') ||
                         value.toLowerCase().includes('shoes'))) {
                        inventory.push({
                            type: 'attribute',
                            block: block.$.blockName,
                            attribute: key,
                            value: value
                        });
                    }
                });
            });
        }
    });
    
    return inventory;
}

function findUniqueActions(rsBlock) {
    // Find all unique action codes to understand what they mean
    const allActions = new Set();
    
    rsBlock.attributeList.forEach(list => {
        if (list.attributeVal) {
            list.attributeVal.forEach(val => {
                const keys = Object.keys(val.$);
                if (keys.length > 0) {
                    allActions.add(val.$[keys[0]]);
                }
            });
        }
    });
    
    return Array.from(allActions).sort();
}

function parseSetupsSection(result) {
    // Parse the setups section to find treasure placements
    const setups = [];
    
    if (result.game.setups && result.game.setups[0]) {
        const setupData = result.game.setups[0];
        
        console.log('Setup data keys:', Object.keys(setupData));
        
        // Look for setup elements that might contain treasure placements
        if (setupData.setup) {
            setupData.setup.forEach(setup => {
                if (setup.$.name) {
                    setups.push({
                        name: setup.$.name,
                        type: 'setup',
                        data: setup
                    });
                }
            });
        }
        
        // Also check for any other setup-related elements
        Object.keys(setupData).forEach(key => {
            if (key !== 'setup' && Array.isArray(setupData[key])) {
                setupData[key].forEach(item => {
                    if (item.$.name) {
                        setups.push({
                            name: item.$.name,
                            type: key,
                            data: item
                        });
                    }
                });
            }
        });
    }
    
    return setups;
}

function findTreasureInSetups(setups) {
    // Look for treasure-related items in the setups
    const treasureSetups = [];
    
    setups.forEach(setup => {
        const name = setup.name || '';
        const lowerName = name.toLowerCase();
        
        // Check if it's a treasure item or site
        if (lowerName.includes('treasure') || 
            lowerName.includes('gold') || 
            lowerName.includes('jewel') || 
            lowerName.includes('gem') || 
            lowerName.includes('crown') || 
            lowerName.includes('sword') || 
            lowerName.includes('armor') || 
            lowerName.includes('boots') || 
            lowerName.includes('grease') || 
            lowerName.includes('mixture') || 
            lowerName.includes('ball') ||
            lowerName.includes('draught') ||
            lowerName.includes('shoes') ||
            lowerName.includes('vault') ||
            lowerName.includes('lair') ||
            lowerName.includes('crypt') ||
            lowerName.includes('altar') ||
            lowerName.includes('shrine') ||
            lowerName.includes('pool') ||
            lowerName.includes('cairns') ||
            lowerName.includes('statue') ||
            lowerName.includes('flutter') ||
            lowerName.includes('patter') ||
            lowerName.includes('howl') ||
            lowerName.includes('slither') ||
            lowerName.includes('lost city')) {
            
            treasureSetups.push(setup);
        }
    });
    
    return treasureSetups;
}

function parseMagicRealmData() {
    try {
        const xmlData = fs.readFileSync('MagicRealmData.xml', 'utf8');
        const parser = new xml2js.Parser();
        
        return parser.parseStringPromise(xmlData);
    } catch (error) {
        console.error('Error reading MagicRealmData.xml:', error);
        return null;
    }
}

function findTreasureSitesInMagicRealmData(result) {
    const treasureSites = [];
    
    if (result && result.game && result.game.objects && result.game.objects[0]) {
        const objects = result.game.objects[0].GameObject;
        
        objects.forEach(obj => {
            const name = obj.$.name || '';
            const lowerName = name.toLowerCase();
            
            // Check if it's a treasure site
            if (lowerName.includes('vault') || 
                lowerName.includes('lair') || 
                lowerName.includes('crypt') || 
                lowerName.includes('altar') || 
                lowerName.includes('shrine') || 
                lowerName.includes('pool') || 
                lowerName.includes('cairns') || 
                lowerName.includes('toadstool') ||
                lowerName.includes('statue') ||
                lowerName.includes('flutter') ||
                lowerName.includes('patter') ||
                lowerName.includes('howl') ||
                lowerName.includes('slither') ||
                lowerName.includes('lost city')) {
                
                const containedItems = [];
                if (obj.contains) {
                    obj.contains.forEach(contained => {
                        if (contained.$.name) {
                            containedItems.push(contained.$.name);
                        }
                    });
                }
                
                treasureSites.push({
                    name: name,
                    type: 'treasure_site',
                    contains: containedItems,
                    attributes: obj.$
                });
            }
        });
    }
    
    return treasureSites;
}

async function parseWoodsGirlDiscoveries() {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync('parsed_sessions/learning-woodsgirl/extracted_game.xml', 'utf8');
        
        // Parse XML
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        // Find Woods Girl character
        const objects = result.game.objects[0].GameObject;
        const woodsGirl = objects.find(obj => obj.$.name === 'Woods Girl');
        if (!woodsGirl) {
            console.log('Woods Girl not found in game data');
            return;
        }
        
        // Find the RS_PB__ block which contains all the day action lists
        const rsBlock = (woodsGirl.AttributeBlock || []).find(block => block.$.blockName === 'RS_PB__');
        
        // Parse notebook entries
        const notebookBlock = (woodsGirl.AttributeBlock || []).find(block => block.$.blockName === '_ntbk_');
        const dateToNote = parseNotebookDates(notebookBlock);
        
        console.log('=== SETUPS SECTION ANALYSIS ===');
        const setups = parseSetupsSection(result);
        console.log(`Found ${setups.length} setup items`);
        
        // Log the actual setup items
        setups.forEach((setup, index) => {
            console.log(`Setup ${index + 1}: ${setup.type} - ${setup.name}`);
            if (setup.data && setup.data.$) {
                console.log(`  Attributes:`, setup.data.$);
            }
        });
        
        console.log('\n=== TREASURE IN SETUPS ===');
        const treasureSetups = findTreasureInSetups(setups);
        treasureSetups.forEach(setup => {
            console.log(`${setup.type}: ${setup.name}`);
        });
        
        console.log('\n=== MAGIC REALM DATA TREASURE SITES ===');
        const magicRealmData = await parseMagicRealmData();
        const magicRealmTreasureSites = findTreasureSitesInMagicRealmData(magicRealmData);
        console.log(`Found ${magicRealmTreasureSites.length} treasure sites in MagicRealmData.xml`);
        
        // Show first few treasure sites from MagicRealmData
        magicRealmTreasureSites.slice(0, 10).forEach(site => {
            console.log(`${site.name}: ${site.contains.length} items`);
            if (site.contains.length > 0) {
                site.contains.forEach(item => console.log(`  - ${item}`));
            }
        });
        
        console.log('\n=== WOODS GIRL CURRENT INVENTORY ===');
        const inventory = findWoodsGirlInventory(woodsGirl);
        if (inventory.length > 0) {
            inventory.forEach(item => {
                if (item.type === 'contained') {
                    console.log(`- ${item.name}`);
                } else {
                    console.log(`- ${item.block}.${item.attribute}: ${item.value}`);
                }
            });
        } else {
            console.log('No inventory found');
        }
        
        console.log('\n=== ALL UNIQUE ACTION CODES ===');
        const uniqueActions = findUniqueActions(rsBlock);
        uniqueActions.forEach(action => {
            console.log(`- ${action}`);
        });
        
        console.log('\n=== TREASURE SITES IN GAME ===');
        const treasureSites = findTreasureSites(objects);
        treasureSites.forEach(site => {
            console.log(`${site.name}: ${site.contains.length} items`);
            if (site.contains.length > 0) {
                site.contains.forEach(item => console.log(`  - ${item}`));
            }
        });
        
        console.log('\n=== TREASURE ITEMS IN GAME ===');
        const treasureItems = findTreasureItems(objects);
        treasureItems.forEach(item => {
            console.log(`- ${item.name}`);
        });
        
        console.log('\n=== WOODS GIRL SEARCH DAYS WITH TREASURE ACTIONS ===');
        // Find all day keys that have actions
        const dayKeys = rsBlock.attributeList
            .map(list => list.$.keyName)
            .filter(key => key.match(/^month_\d+_day_\d+$/))
            .sort();
        
        dayKeys.forEach(dayKey => {
            const actions = getDayActions(rsBlock, dayKey);
            const searchActions = actions.filter(action => action === 'S');
            const lootActions = findLootActions(rsBlock, dayKey);
            const treasureActions = findTreasureActions(rsBlock, dayKey);
            
            if (searchActions.length > 0) {
                console.log(`\n${dayKey}:`);
                console.log(`  Actions: ${actions.join(', ')}`);
                console.log(`  Searches: ${searchActions.length}`);
                if (lootActions.length > 0) {
                    console.log(`  Loot actions: ${lootActions.join(', ')}`);
                }
                if (treasureActions.length > 0) {
                    console.log(`  Treasure actions: ${treasureActions.join(', ')}`);
                }
                
                const noteData = dateToNote[dayKey];
                if (noteData) {
                    console.log(`  Notebook: [${noteData.event}] ${noteData.note}`);
                }
            }
        });
        
        console.log('\n=== SEARCH DISCOVERIES CORRELATION ===');
        const searchDiscoveries = Object.entries(dateToNote).filter(([day, data]) => {
            const actions = getDayActions(rsBlock, day);
            const searchActions = actions.filter(action => action === 'S');
            return searchActions.length > 0 && data.event === 'Clues';
        });
        
        searchDiscoveries.forEach(([day, data]) => {
            const actions = getDayActions(rsBlock, day);
            const searchActions = actions.filter(action => action === 'S');
            const lootActions = findLootActions(rsBlock, day);
            const treasureActions = findTreasureActions(rsBlock, day);
            
            console.log(`\n${day}: Searched ${searchActions.length} time(s)`);
            console.log(`  Found: ${data.note}`);
            console.log(`  All actions: ${actions.join(', ')}`);
            if (lootActions.length > 0) {
                console.log(`  Loot actions: ${lootActions.join(', ')}`);
            }
            if (treasureActions.length > 0) {
                console.log(`  Treasure actions: ${treasureActions.join(', ')}`);
            }
        });
        
        console.log('\n=== SUMMARY ===');
        const totalSearches = dayKeys.reduce((total, dayKey) => {
            const actions = getDayActions(rsBlock, dayKey);
            return total + actions.filter(action => action === 'S').length;
        }, 0);
        
        const searchDiscoveriesCount = searchDiscoveries.length;
        
        console.log(`Total search actions: ${totalSearches}`);
        console.log(`Search discoveries: ${searchDiscoveriesCount}`);
        console.log(`Search success rate: ${((searchDiscoveriesCount / totalSearches) * 100).toFixed(1)}%`);
        console.log(`Treasure sites found: ${treasureSites.length}`);
        console.log(`Treasure items found: ${treasureItems.length}`);
        console.log(`Current inventory items: ${inventory.length}`);
        console.log(`Setup items found: ${setups.length}`);
        console.log(`Treasure in setups: ${treasureSetups.length}`);
        console.log(`MagicRealmData treasure sites: ${magicRealmTreasureSites.length}`);
        
    } catch (error) {
        console.error('Error parsing Woods Girl discoveries:', error);
        console.error('Error details:', error.message);
    }
}

parseWoodsGirlDiscoveries(); 