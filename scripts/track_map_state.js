const fs = require('fs');
const path = require('path');

function parseEnchantmentEvents(parsedSession) {
    const enchantmentEvents = [];
    
    // Go through each day and look for enchantment actions
    Object.entries(parsedSession.days).forEach(([dayKey, dayData]) => {
        const [month, day] = dayKey.split('_').map(Number);
        
        dayData.characterTurns.forEach(turn => {
            turn.actions.forEach(action => {
                // Look for spell actions that enchant tiles
                if (action.action === 'Spell' && action.result.includes('enchanted')) {
                    const match = action.result.match(/enchanted (.+)/);
                    if (match) {
                        const tileName = match[1].trim();
                        // Skip if it's enchanting a character's magic (not a tile)
                        if (!tileName.includes('Magic') && !tileName.includes('*')) {
                            enchantmentEvents.push({
                                day: dayKey,
                                month: month,
                                dayNumber: day,
                                character: turn.character,
                                tileName: tileName,
                                action: action
                            });
                        }
                    }
                }
            });
        });
    });
    
    return enchantmentEvents;
}

function parseCharacterPositions(parsedSession) {
    const characterPositions = {};
    
    // Initialize character positions
    Object.keys(parsedSession.characterToPlayer).forEach(character => {
        characterPositions[character] = [];
    });
    
    // Go through each day and track character positions
    Object.entries(parsedSession.days).forEach(([dayKey, dayData]) => {
        const [month, day] = dayKey.split('_').map(Number);
        
        dayData.characterTurns.forEach(turn => {
            if (!characterPositions[turn.character]) {
                characterPositions[turn.character] = [];
            }
            
            characterPositions[turn.character].push({
                day: dayKey,
                month: month,
                dayNumber: day,
                startLocation: turn.startLocation,
                endLocation: turn.endLocation,
                character: turn.character
            });
        });
    });
    
    return characterPositions;
}

function createMapStateTracker(parsedSession, mapData) {
    const enchantmentEvents = parseEnchantmentEvents(parsedSession);
    const characterPositions = parseCharacterPositions(parsedSession);
    
    // Create a map of tile names to their positions
    const tileNameToPosition = {};
    mapData.tiles.forEach(tile => {
        tileNameToPosition[tile.objectName] = tile.position;
    });
    
    // Create a map of positions to tile names
    const positionToTileName = {};
    mapData.tiles.forEach(tile => {
        positionToTileName[tile.position] = tile.objectName;
    });
    
    // Create enchantment timeline
    const enchantmentTimeline = {};
    enchantmentEvents.forEach(event => {
        const tileName = event.tileName;
        if (!enchantmentTimeline[tileName]) {
            enchantmentTimeline[tileName] = [];
        }
        enchantmentTimeline[tileName].push({
            day: event.day,
            month: event.month,
            dayNumber: event.dayNumber,
            character: event.character
        });
    });
    
    // Function to get tile enchantment state for a specific day
    function getTileEnchantmentState(tileName, targetDay) {
        if (!enchantmentTimeline[tileName]) {
            return false; // Never enchanted
        }
        
        // Find the first enchantment event for this tile
        const firstEnchantment = enchantmentTimeline[tileName][0];
        if (!firstEnchantment) {
            return false;
        }
        
        // Check if the target day is on or after the enchantment day
        const [targetMonth, targetDayNum] = targetDay.split('_').map(Number);
        const enchantMonth = firstEnchantment.month;
        const enchantDay = firstEnchantment.dayNumber;
        
        if (targetMonth > enchantMonth) {
            return true;
        } else if (targetMonth === enchantMonth && targetDayNum >= enchantDay) {
            return true;
        }
        
        return false;
    }
    
    // Function to get character positions for a specific day
    function getCharacterPositions(targetDay) {
        const positions = {};
        
        Object.entries(characterPositions).forEach(([character, positions]) => {
            // Find the position for this character on the target day
            const dayPosition = positions.find(pos => pos.day === targetDay);
            if (dayPosition) {
                positions[character] = {
                    endLocation: dayPosition.endLocation,
                    startLocation: dayPosition.startLocation
                };
            }
        });
        
        return positions;
    }
    
    // Function to get map state for a specific day
    function getMapState(targetDay) {
        const mapState = {
            day: targetDay,
            tiles: mapData.tiles.map(tile => ({
                ...tile,
                isEnchanted: getTileEnchantmentState(tile.objectName, targetDay)
            })),
            characterPositions: getCharacterPositions(targetDay),
            enchantmentEvents: enchantmentEvents.filter(event => event.day === targetDay)
        };
        
        return mapState;
    }
    
    return {
        enchantmentEvents,
        characterPositions,
        enchantmentTimeline,
        tileNameToPosition,
        positionToTileName,
        getTileEnchantmentState,
        getCharacterPositions,
        getMapState,
        getAllDays: () => Object.keys(parsedSession.days).sort()
    };
}

function generateMapStateData(sessionDir) {
    console.log('🔍 Analyzing map state for session...');
    
    // Read parsed session data
    const parsedSessionPath = path.join(sessionDir, 'parsed_session.json');
    const mapDataPath = path.join(sessionDir, 'map_data.json');
    
    if (!fs.existsSync(parsedSessionPath)) {
        console.error('Parsed session data not found:', parsedSessionPath);
        return null;
    }
    
    if (!fs.existsSync(mapDataPath)) {
        console.error('Map data not found:', mapDataPath);
        return null;
    }
    
    const parsedSession = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
    const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
    
    // Create the map state tracker
    const tracker = createMapStateTracker(parsedSession, mapData);
    
    // Generate map state for each day
    const allDays = tracker.getAllDays();
    const mapStates = {};
    
    allDays.forEach(day => {
        mapStates[day] = tracker.getMapState(day);
    });
    
    // Create summary data
    const summary = {
        sessionName: parsedSession.sessionName,
        totalDays: allDays.length,
        enchantmentEvents: tracker.enchantmentEvents,
        characterPositions: tracker.characterPositions,
        enchantmentTimeline: tracker.enchantmentTimeline,
        mapStates: mapStates
    };
    
    // Save the map state data
    const outputPath = path.join(sessionDir, 'map_state_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    
    console.log(`✅ Map state data generated:`);
    console.log(`   - ${allDays.length} days analyzed`);
    console.log(`   - ${tracker.enchantmentEvents.length} enchantment events found`);
    console.log(`   - ${Object.keys(tracker.characterPositions).length} characters tracked`);
    console.log(`   - Output saved to: ${path.basename(outputPath)}`);
    
    return summary;
}

// Main execution
if (require.main === module) {
    const sessionDir = process.argv[2] || '.';
    generateMapStateData(sessionDir);
}

module.exports = {
    parseEnchantmentEvents,
    parseCharacterPositions,
    createMapStateTracker,
    generateMapStateData
}; 