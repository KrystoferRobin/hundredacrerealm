const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const parseCharacterGameState = (xmlPath, characterName, outputDir) => {
    console.log(`Parsing character game state for: ${characterName}`);
    
    try {
        // Read the XML file
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text'
        });
        
        const xmlData = parser.parse(xmlContent);
        
        // Find the character GameObject
        const character = findCharacterByName(xmlData, characterName);
        
        if (!character) {
            console.error(`Character ${characterName} not found in game state`);
            return null;
        }
        
        // Parse character data
        const characterData = parseCharacterData(character);
        
        // Save to output directory
        const outputPath = path.join(outputDir, `${characterName.replace(/\s+/g, '_')}_game_state.json`);
        fs.writeFileSync(outputPath, JSON.stringify(characterData, null, 2));
        
        console.log(`Character game state saved to: ${outputPath}`);
        return characterData;
        
    } catch (error) {
        console.error(`Error parsing character game state: ${error.message}`);
        throw error;
    }
};

const findCharacterByName = (xmlData, characterName) => {
    const findInObjects = (objects) => {
        if (!objects || !Array.isArray(objects)) return null;
        
        for (const obj of objects) {
            if (obj['@_name'] === characterName && obj.AttributeBlock) {
                // Check if it's a character (has character attribute)
                const thisBlock = obj.AttributeBlock.find(block => block['@_blockName'] === 'this');
                if (thisBlock && thisBlock.attribute) {
                    const attributes = Array.isArray(thisBlock.attribute) ? thisBlock.attribute : [thisBlock.attribute];
                    const characterAttr = attributes.find(attr => attr['@_character'] !== undefined);
                    if (characterAttr) {
                        return obj;
                    }
                }
            }
        }
        return null;
    };
    
    // Search in the objects array
    if (xmlData.game && xmlData.game.objects && xmlData.game.objects.GameObject) {
        const objects = Array.isArray(xmlData.game.objects.GameObject) ? 
            xmlData.game.objects.GameObject : [xmlData.game.objects.GameObject];
        return findInObjects(objects);
    }
    
    return null;
};

const parseCharacterData = (character) => {
    const data = {
        id: character['@_id'],
        name: character['@_name'],
        gameState: {
            currentLevel: null,
            currentLocation: null,
            fame: null,
            notoriety: null,
            gold: null,
            inventory: [],
            spells: [],
            relationships: {},
            dailyActions: {},
            movementHistory: [],
            combatHistory: [],
            notes: []
        },
        baseCharacter: {
            // This will be populated from coregamedata
        }
    };
    
    // Parse all attribute blocks
    if (character.AttributeBlock) {
        const blocks = Array.isArray(character.AttributeBlock) ? character.AttributeBlock : [character.AttributeBlock];
        
        blocks.forEach(block => {
            const blockName = block['@_blockName'];
            
            switch (blockName) {
                case 'this':
                    parseThisBlock(block, data);
                    break;
                case 'RS_PB__':
                    parsePlayerBlock(block, data);
                    break;
                case 'relationship':
                    parseRelationshipBlock(block, data);
                    break;
                case '_ntbk_':
                    parseNotebookBlock(block, data);
                    break;
                case 'kills_b':
                    parseKillsBlock(block, data);
                    break;
                default:
                    // Parse day-specific blocks (month_X_day_Y)
                    if (blockName.match(/month_\d+_day_\d+/)) {
                        parseDayBlock(block, data);
                    }
                    break;
            }
        });
    }
    
    // Parse contained items
    if (character.contains) {
        const contains = Array.isArray(character.contains) ? character.contains : [character.contains];
        data.gameState.inventory = contains.map(item => ({
            id: item['@_id'],
            type: 'contained_item'
        }));
    }
    
    return data;
};

const parseThisBlock = (block, data) => {
    if (!block.attribute) return;
    
    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
    
    attributes.forEach(attr => {
        const key = Object.keys(attr)[0];
        const value = attr[key];
        
        switch (key) {
            case '@_vulnerability':
                data.gameState.vulnerability = value;
                break;
            case '@_start':
                data.gameState.startLocation = value;
                break;
            case '@_facing':
                data.gameState.facing = value;
                break;
            case '@_pronoun':
                data.gameState.pronoun = value;
                break;
        }
    });
};

const parsePlayerBlock = (block, data) => {
    if (!block.attribute) return;
    
    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
    
    attributes.forEach(attr => {
        const key = Object.keys(attr)[0];
        const value = attr[key];
        
        switch (key) {
            case '@_plnm__':
                data.gameState.playerName = value;
                break;
            case '@_pllv__':
                data.gameState.currentLevel = parseInt(value);
                break;
            case '@_spllv__':
                data.gameState.spellLevel = parseInt(value);
                break;
            case '@_plst__':
                data.gameState.strength = parseInt(value);
                break;
            case '@_splst__':
                data.gameState.spellStrength = parseInt(value);
                break;
            case '@_gol__':
                data.gameState.gold = parseFloat(value);
                break;
            case '@_fam__':
                data.gameState.fame = parseFloat(value);
                break;
            case '@_not__':
                data.gameState.notoriety = parseFloat(value);
                break;
            case '@_c_mnth':
                data.gameState.currentMonth = parseInt(value);
                break;
            case '@_c_day':
                data.gameState.currentDay = parseInt(value);
                break;
        }
    });
    
    // Parse attribute lists
    if (block.attributeList) {
        const lists = Array.isArray(block.attributeList) ? block.attributeList : [block.attributeList];
        
        lists.forEach(list => {
            const keyName = list['@_keyName'];
            
            switch (keyName) {
                case 'sspells__':
                    if (list.attributeVal) {
                        const spells = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                        data.gameState.spells = spells.map(spell => spell['#text']);
                    }
                    break;
                case 'dother__':
                    if (list.attributeVal) {
                        const others = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                        data.gameState.otherInfo = others.map(item => item['#text']);
                    }
                    break;
            }
        });
    }
};

const parseRelationshipBlock = (block, data) => {
    if (!block.attribute) return;
    
    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
    
    attributes.forEach(attr => {
        const key = Object.keys(attr)[0];
        const value = attr[key];
        
        if (key.startsWith('@_')) {
            const faction = key.substring(2);
            data.gameState.relationships[faction] = parseInt(value);
        }
    });
};

const parseNotebookBlock = (block, data) => {
    if (!block.attribute) return;
    
    const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
    const notes = [];
    
    // Group notes by index
    const noteGroups = {};
    
    attributes.forEach(attr => {
        const key = Object.keys(attr)[0];
        const value = attr[key];
        
        if (key.match(/^(source|event|date|note)\d+$/)) {
            const [, type, index] = key.match(/^(\w+)(\d+)$/);
            
            if (!noteGroups[index]) {
                noteGroups[index] = {};
            }
            
            noteGroups[index][type] = value;
        }
    });
    
    // Convert to array
    Object.values(noteGroups).forEach(note => {
        if (note.source && note.event && note.date && note.note) {
            notes.push({
                source: note.source,
                event: note.event,
                date: note.date,
                note: note.note
            });
        }
    });
    
    data.gameState.notes = notes;
};

const parseKillsBlock = (block, data) => {
    if (!block.attributeList) return;
    
    const lists = Array.isArray(block.attributeList) ? block.attributeList : [block.attributeList];
    const kills = {};
    
    lists.forEach(list => {
        const keyName = list['@_keyName'];
        
        if (keyName.match(/^month_\d+_day_\d+$/)) {
            if (list.attributeVal) {
                const values = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                kills[keyName] = values.map(val => val['#text']);
            }
        } else if (keyName.match(/^month_\d+_day_\d+s$/)) {
            if (list.attributeVal) {
                const values = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                const dayKey = keyName.replace('s', '');
                if (kills[dayKey]) {
                    kills[`${dayKey}_stats`] = values.map(val => val['#text']);
                }
            }
        }
    });
    
    data.gameState.combatHistory = kills;
};

const parseDayBlock = (block, data) => {
    const dayKey = block['@_blockName'];
    
    if (!data.gameState.dailyActions[dayKey]) {
        data.gameState.dailyActions[dayKey] = {
            actions: [],
            phases: {},
            monsterRolls: []
        };
    }
    
    // Parse attributes
    if (block.attribute) {
        const attributes = Array.isArray(block.attribute) ? block.attribute : [block.attribute];
        
        attributes.forEach(attr => {
            const key = Object.keys(attr)[0];
            const value = attr[key];
            
            switch (key) {
                case '@_b_phs':
                    data.gameState.dailyActions[dayKey].phases.battle = parseInt(value);
                    break;
                case '@_s_phs':
                    data.gameState.dailyActions[dayKey].phases.spell = parseInt(value);
                    break;
                case '@_sh_phs':
                    data.gameState.dailyActions[dayKey].phases.shoot = parseInt(value);
                    break;
                case '@_m_rlll':
                    data.gameState.dailyActions[dayKey].monsterRolls.push(value);
                    break;
            }
        });
    }
    
    // Parse attribute lists for actions
    if (block.attributeList) {
        const lists = Array.isArray(block.attributeList) ? block.attributeList : [block.attributeList];
        
        lists.forEach(list => {
            const keyName = list['@_keyName'];
            
            if (list.attributeVal) {
                const values = Array.isArray(list.attributeVal) ? list.attributeVal : [list.attributeVal];
                
                switch (keyName) {
                    case dayKey:
                        data.gameState.dailyActions[dayKey].actions = values.map(val => val['#text']);
                        break;
                    case `${dayKey}v`:
                        data.gameState.dailyActions[dayKey].visibility = values.map(val => val['#text']);
                        break;
                    case `${dayKey}c`:
                        data.gameState.dailyActions[dayKey].clearing = values.map(val => val['#text']);
                        break;
                    case `${dayKey}p`:
                        data.gameState.dailyActions[dayKey].phases = values.map(val => val['#text']);
                        break;
                    case `${dayKey}m`:
                        data.gameState.dailyActions[dayKey].movements = values.map(val => val['#text']);
                        break;
                    case `${dayKey}r`:
                        data.gameState.dailyActions[dayKey].results = values.map(val => val['#text']);
                        break;
                }
            }
        });
    }
};

// Test the parser
if (require.main === module) {
    const xmlPath = path.join(__dirname, '../parsed_sessions/learning-woodsgirl/extracted_game.xml');
    const outputDir = path.join(__dirname, '../parsed_sessions/learning-woodsgirl');
    
    if (fs.existsSync(xmlPath)) {
        try {
            const characterData = parseCharacterGameState(xmlPath, 'Woods Girl', outputDir);
            console.log('Character game state parsed successfully');
            
            // Log some key information
            if (characterData) {
                console.log(`\nCharacter: ${characterData.name}`);
                console.log(`Current Level: ${characterData.gameState.currentLevel}`);
                console.log(`Fame: ${characterData.gameState.fame}`);
                console.log(`Notoriety: ${characterData.gameState.notoriety}`);
                console.log(`Gold: ${characterData.gameState.gold}`);
                console.log(`Inventory Items: ${characterData.gameState.inventory.length}`);
                console.log(`Spells: ${characterData.gameState.spells.length}`);
                console.log(`Notes: ${characterData.gameState.notes.length}`);
                console.log(`Days with Actions: ${Object.keys(characterData.gameState.dailyActions).length}`);
            }
        } catch (error) {
            console.error('Failed to parse character game state:', error.message);
        }
    } else {
        console.error(`XML file not found: ${xmlPath}`);
    }
}

module.exports = { parseCharacterGameState }; 