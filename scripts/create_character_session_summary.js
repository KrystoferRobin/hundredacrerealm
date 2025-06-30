const fs = require('fs');
const path = require('path');

const createCharacterSessionSummary = (baseCharacterPath, gameStatePath, itemsPath, outputDir) => {
    console.log('Creating comprehensive character session summary...');
    
    try {
        // Load all data
        const baseCharacter = JSON.parse(fs.readFileSync(baseCharacterPath, 'utf8'));
        const gameState = JSON.parse(fs.readFileSync(gameStatePath, 'utf8'));
        const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
        
        // Create comprehensive summary
        const summary = {
            character: {
                name: gameState.name,
                id: gameState.id,
                baseCharacter: {
                    name: baseCharacter.name,
                    vulnerability: baseCharacter.attributeBlocks.this.vulnerability,
                    startLocation: baseCharacter.attributeBlocks.this.start,
                    pronoun: baseCharacter.attributeBlocks.this.pronoun,
                    totalParts: baseCharacter.parts.length,
                    baseParts: baseCharacter.parts.map(part => ({
                        id: part.id,
                        name: part.name,
                        action: part.attributeBlocks.this.action,
                        strength: part.attributeBlocks.this.strength,
                        speed: part.attributeBlocks.this.speed,
                        level: part.attributeBlocks.this.level
                    }))
                }
            },
            gameProgress: {
                currentLevel: gameState.gameState.currentLevel,
                currentMonth: gameState.gameState.currentMonth,
                currentDay: gameState.gameState.currentDay,
                fame: gameState.gameState.fame,
                notoriety: gameState.gameState.notoriety,
                gold: gameState.gameState.gold,
                strength: gameState.gameState.strength,
                spellStrength: gameState.gameState.spellStrength,
                playerName: gameState.gameState.playerName
            },
            inventory: {
                totalItems: gameState.gameState.inventory.length,
                basePartsRetained: gameState.gameState.inventory.filter(item => 
                    baseCharacter.parts.some(part => part.id === item.id)
                ).length,
                acquiredItems: gameState.gameState.inventory.filter(item => 
                    !baseCharacter.parts.some(part => part.id === item.id)
                ).length,
                items: {
                    treasures: items.treasures.map(item => ({
                        id: item.id,
                        name: item.name,
                        attributes: item.attributeBlocks.this || {}
                    })),
                    spells: items.spells.map(item => ({
                        id: item.id,
                        name: item.name,
                        attributes: item.attributeBlocks.this || {}
                    })),
                    weapons: items.weapons.map(item => ({
                        id: item.id,
                        name: item.name,
                        attributes: item.attributeBlocks.this || {}
                    })),
                    unknown: items.unknown.map(item => ({
                        id: item.id,
                        name: item.name,
                        attributes: item.attributeBlocks.this || {}
                    }))
                }
            },
            relationships: gameState.gameState.relationships,
            notes: gameState.gameState.notes,
            combatHistory: gameState.gameState.combatHistory,
            dailyActions: {
                totalDays: Object.keys(gameState.gameState.dailyActions).length,
                daysWithActions: Object.keys(gameState.gameState.dailyActions).filter(day => 
                    gameState.gameState.dailyActions[day].actions && 
                    gameState.gameState.dailyActions[day].actions.length > 0
                ).length,
                sampleDays: Object.entries(gameState.gameState.dailyActions)
                    .slice(0, 5)
                    .map(([day, data]) => ({
                        day: day,
                        actions: data.actions || [],
                        phases: data.phases || {},
                        monsterRolls: data.monsterRolls || []
                    }))
            },
            summary: {
                itemsGained: items.treasures.length + items.spells.length + items.weapons.length + items.unknown.length,
                itemsLost: 0, // All base parts are retained
                netChange: items.treasures.length + items.spells.length + items.weapons.length + items.unknown.length,
                totalValue: calculateTotalValue(items),
                progression: {
                    levelGained: gameState.gameState.currentLevel - 1, // Assuming started at level 1
                    fameGained: gameState.gameState.fame,
                    notorietyGained: gameState.gameState.notoriety,
                    goldEarned: gameState.gameState.gold
                }
            }
        };
        
        // Save comprehensive summary
        const outputPath = path.join(outputDir, `${gameState.name.replace(/\s+/g, '_')}_session_summary.json`);
        fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
        
        // Print summary
        console.log('\n=== CHARACTER SESSION SUMMARY ===');
        console.log(`Character: ${summary.character.name}`);
        console.log(`Player: ${summary.gameProgress.playerName}`);
        console.log(`Current Level: ${summary.gameProgress.currentLevel}`);
        console.log(`Current Date: Month ${summary.gameProgress.currentMonth}, Day ${summary.gameProgress.currentDay}`);
        console.log(`Fame: ${summary.gameProgress.fame}, Notoriety: ${summary.gameProgress.notoriety}`);
        console.log(`Gold: ${summary.gameProgress.gold}`);
        console.log(`Strength: ${summary.gameProgress.strength}, Spell Strength: ${summary.gameProgress.spellStrength}`);
        
        console.log('\n=== INVENTORY ===');
        console.log(`Total Items: ${summary.inventory.totalItems}`);
        console.log(`Base Parts Retained: ${summary.inventory.basePartsRetained}`);
        console.log(`Acquired Items: ${summary.inventory.acquiredItems}`);
        
        if (summary.inventory.items.treasures.length > 0) {
            console.log('\nTreasures:');
            summary.inventory.items.treasures.forEach(item => console.log(`  ${item.name}`));
        }
        
        if (summary.inventory.items.spells.length > 0) {
            console.log('\nSpells:');
            summary.inventory.items.spells.forEach(item => console.log(`  ${item.name}`));
        }
        
        if (summary.inventory.items.weapons.length > 0) {
            console.log('\nWeapons:');
            summary.inventory.items.weapons.forEach(item => console.log(`  ${item.name}`));
        }
        
        if (summary.inventory.items.unknown.length > 0) {
            console.log('\nOther Items:');
            summary.inventory.items.unknown.forEach(item => console.log(`  ${item.name}`));
        }
        
        console.log('\n=== PROGRESSION ===');
        console.log(`Levels Gained: ${summary.summary.progression.levelGained}`);
        console.log(`Items Gained: ${summary.summary.itemsGained}`);
        console.log(`Items Lost: ${summary.summary.itemsLost}`);
        console.log(`Net Change: ${summary.summary.netChange}`);
        console.log(`Days Played: ${summary.dailyActions.totalDays}`);
        console.log(`Days with Actions: ${summary.dailyActions.daysWithActions}`);
        
        if (summary.notes.length > 0) {
            console.log('\n=== NOTES ===');
            summary.notes.forEach(note => {
                console.log(`${note.date} - ${note.event}: ${note.note}`);
            });
        }
        
        return summary;
        
    } catch (error) {
        console.error(`Error creating character session summary: ${error.message}`);
        throw error;
    }
};

const calculateTotalValue = (items) => {
    let total = 0;
    
    // Add up treasure values if available
    items.treasures.forEach(item => {
        const thisBlock = item.attributeBlocks.this || {};
        if (thisBlock.base_price) {
            total += parseInt(thisBlock.base_price) || 0;
        }
    });
    
    return total;
};

// Test the summary creator
if (require.main === module) {
    const baseCharacterPath = path.join(__dirname, '../coregamedata/characters/Woods_Girl/Woods_Girl.json');
    const gameStatePath = path.join(__dirname, '../parsed_sessions/learning-woodsgirl/Woods_Girl_game_state.json');
    const itemsPath = path.join(__dirname, '../parsed_sessions/learning-woodsgirl/game_state_items.json');
    const outputDir = path.join(__dirname, '../parsed_sessions/learning-woodsgirl');
    
    if (fs.existsSync(baseCharacterPath) && fs.existsSync(gameStatePath) && fs.existsSync(itemsPath)) {
        try {
            const summary = createCharacterSessionSummary(baseCharacterPath, gameStatePath, itemsPath, outputDir);
        } catch (error) {
            console.error('Failed to create character session summary:', error.message);
        }
    } else {
        console.error('Required files not found');
        console.error(`Base character: ${baseCharacterPath} - ${fs.existsSync(baseCharacterPath)}`);
        console.error(`Game state: ${gameStatePath} - ${fs.existsSync(gameStatePath)}`);
        console.error(`Items: ${itemsPath} - ${fs.existsSync(itemsPath)}`);
    }
}

module.exports = { createCharacterSessionSummary }; 