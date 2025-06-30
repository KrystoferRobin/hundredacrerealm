const fs = require('fs');
const path = require('path');

const identifyItems = (itemIds, outputDir) => {
    console.log('Identifying acquired items...');
    
    const items = {
        treasures: [],
        armor: [],
        weapons: [],
        spells: [],
        monsters: [],
        natives: [],
        chits: [],
        unknown: []
    };
    
    itemIds.forEach(id => {
        let found = false;
        
        // Check treasures
        const treasurePath = path.join(__dirname, '../coregamedata/items/treasures');
        if (fs.existsSync(treasurePath)) {
            const files = fs.readdirSync(treasurePath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const treasure = JSON.parse(fs.readFileSync(path.join(treasurePath, file), 'utf8'));
                    if (treasure.ids && treasure.ids.includes(id)) {
                        items.treasures.push({
                            id: id,
                            name: treasure.name,
                            file: file
                        });
                        found = true;
                        break;
                    }
                }
            }
        }
        
        // Check armor
        if (!found) {
            const armorPath = path.join(__dirname, '../coregamedata/items/armor');
            if (fs.existsSync(armorPath)) {
                const files = fs.readdirSync(armorPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const armor = JSON.parse(fs.readFileSync(path.join(armorPath, file), 'utf8'));
                        if (armor.ids && armor.ids.includes(id)) {
                            items.armor.push({
                                id: id,
                                name: armor.name,
                                file: file
                            });
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Check weapons
        if (!found) {
            const weaponPath = path.join(__dirname, '../coregamedata/items/weapons');
            if (fs.existsSync(weaponPath)) {
                const files = fs.readdirSync(weaponPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const weapon = JSON.parse(fs.readFileSync(path.join(weaponPath, file), 'utf8'));
                        if (weapon.ids && weapon.ids.includes(id)) {
                            items.weapons.push({
                                id: id,
                                name: weapon.name,
                                file: file
                            });
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Check spells
        if (!found) {
            const spellsPath = path.join(__dirname, '../coregamedata/spells');
            if (fs.existsSync(spellsPath)) {
                const spellFolders = fs.readdirSync(spellsPath);
                for (const folder of spellFolders) {
                    const folderPath = path.join(spellsPath, folder);
                    if (fs.statSync(folderPath).isDirectory()) {
                        const files = fs.readdirSync(folderPath);
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                const spell = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
                                if (spell.ids && spell.ids.includes(id)) {
                                    items.spells.push({
                                        id: id,
                                        name: spell.name,
                                        level: folder,
                                        file: file
                                    });
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) break;
                    }
                }
            }
        }
        
        // Check monsters
        if (!found) {
            const monstersPath = path.join(__dirname, '../coregamedata/monsters');
            if (fs.existsSync(monstersPath)) {
                const files = fs.readdirSync(monstersPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const monster = JSON.parse(fs.readFileSync(path.join(monstersPath, file), 'utf8'));
                        if (monster.ids && monster.ids.includes(id)) {
                            items.monsters.push({
                                id: id,
                                name: monster.name,
                                file: file
                            });
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Check natives
        if (!found) {
            const nativesPath = path.join(__dirname, '../coregamedata/natives');
            if (fs.existsSync(nativesPath)) {
                const nativeFolders = fs.readdirSync(nativesPath);
                for (const folder of nativeFolders) {
                    const folderPath = path.join(nativesPath, folder);
                    if (fs.statSync(folderPath).isDirectory()) {
                        const files = fs.readdirSync(folderPath);
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                const native = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
                                if (native.ids && native.ids.includes(id)) {
                                    items.natives.push({
                                        id: id,
                                        name: native.name,
                                        dwelling: folder,
                                        file: file
                                    });
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) break;
                    }
                }
            }
        }
        
        // Check chits
        if (!found) {
            const chitsPath = path.join(__dirname, '../coregamedata/chits');
            if (fs.existsSync(chitsPath)) {
                const chitFolders = fs.readdirSync(chitsPath);
                for (const folder of chitFolders) {
                    const folderPath = path.join(chitsPath, folder);
                    if (fs.statSync(folderPath).isDirectory()) {
                        const files = fs.readdirSync(folderPath);
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                const chit = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
                                if (chit.ids && chit.ids.includes(id)) {
                                    items.chits.push({
                                        id: id,
                                        name: chit.name,
                                        type: folder,
                                        file: file
                                    });
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) break;
                    }
                }
            }
        }
        
        // If not found anywhere, mark as unknown
        if (!found) {
            items.unknown.push({
                id: id,
                name: `Unknown Item ${id}`
            });
        }
    });
    
    // Save results
    const outputPath = path.join(outputDir, 'acquired_items_identified.json');
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    
    // Print summary
    console.log('\nAcquired Items Summary:');
    console.log(`  Treasures: ${items.treasures.length}`);
    console.log(`  Armor: ${items.armor.length}`);
    console.log(`  Weapons: ${items.weapons.length}`);
    console.log(`  Spells: ${items.spells.length}`);
    console.log(`  Monsters: ${items.monsters.length}`);
    console.log(`  Natives: ${items.natives.length}`);
    console.log(`  Chits: ${items.chits.length}`);
    console.log(`  Unknown: ${items.unknown.length}`);
    
    if (items.treasures.length > 0) {
        console.log('\nTreasures:');
        items.treasures.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
    }
    
    if (items.armor.length > 0) {
        console.log('\nArmor:');
        items.armor.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
    }
    
    if (items.weapons.length > 0) {
        console.log('\nWeapons:');
        items.weapons.forEach(item => console.log(`  ${item.name} (ID: ${item.id})`));
    }
    
    if (items.spells.length > 0) {
        console.log('\nSpells:');
        items.spells.forEach(item => console.log(`  ${item.name} (Level ${item.level}, ID: ${item.id})`));
    }
    
    if (items.unknown.length > 0) {
        console.log('\nUnknown Items:');
        items.unknown.forEach(item => console.log(`  ${item.name}`));
    }
    
    return items;
};

// Test the identifier
if (require.main === module) {
    const itemIds = ['165', '3360', '334', '379', '351', '330', '324', '327', '340', '238', '133'];
    const outputDir = path.join(__dirname, '../parsed_sessions/learning-woodsgirl');
    
    try {
        const items = identifyItems(itemIds, outputDir);
    } catch (error) {
        console.error('Failed to identify items:', error.message);
    }
}

module.exports = { identifyItems }; 