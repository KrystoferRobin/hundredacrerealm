const fs = require('fs');
const path = require('path');

const analyzeCharacterDifferences = (baseCharacterPath, gameStatePath, outputDir) => {
    console.log('Analyzing character differences...');
    
    try {
        // Load base character data
        const baseCharacter = JSON.parse(fs.readFileSync(baseCharacterPath, 'utf8'));
        
        // Load game state data
        const gameState = JSON.parse(fs.readFileSync(gameStatePath, 'utf8'));
        
        // Get base character part IDs
        const basePartIds = baseCharacter.parts.map(part => part.id);
        
        // Get game state inventory IDs
        const gameStateInventoryIds = gameState.gameState.inventory.map(item => item.id);
        
        // Find items that are not part of the base character
        const acquiredItems = gameStateInventoryIds.filter(id => !basePartIds.includes(id));
        
        // Find base character parts that are still present
        const retainedParts = gameStateInventoryIds.filter(id => basePartIds.includes(id));
        
        // Create analysis result
        const analysis = {
            characterName: gameState.name,
            baseCharacter: {
                totalParts: baseCharacter.parts.length,
                partIds: basePartIds
            },
            gameState: {
                currentLevel: gameState.gameState.currentLevel,
                fame: gameState.gameState.fame,
                notoriety: gameState.gameState.notoriety,
                gold: gameState.gameState.gold,
                totalInventory: gameStateInventoryIds.length,
                retainedParts: retainedParts.length,
                acquiredItems: acquiredItems.length
            },
            differences: {
                acquiredItems: acquiredItems,
                retainedParts: retainedParts,
                missingParts: basePartIds.filter(id => !gameStateInventoryIds.includes(id))
            },
            summary: {
                itemsGained: acquiredItems.length,
                itemsLost: basePartIds.filter(id => !gameStateInventoryIds.includes(id)).length,
                netChange: acquiredItems.length - basePartIds.filter(id => !gameStateInventoryIds.includes(id)).length
            }
        };
        
        // Save analysis
        const outputPath = path.join(outputDir, `${gameState.name.replace(/\s+/g, '_')}_analysis.json`);
        fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
        
        console.log('Analysis completed successfully');
        console.log(`\nSummary for ${gameState.name}:`);
        console.log(`  Current Level: ${analysis.gameState.currentLevel}`);
        console.log(`  Fame: ${analysis.gameState.fame}, Notoriety: ${analysis.gameState.notoriety}`);
        console.log(`  Gold: ${analysis.gameState.gold}`);
        console.log(`  Base Parts: ${analysis.baseCharacter.totalParts}`);
        console.log(`  Retained Parts: ${analysis.gameState.retainedParts}`);
        console.log(`  Acquired Items: ${analysis.gameState.acquiredItems}`);
        console.log(`  Items Gained: ${analysis.summary.itemsGained}`);
        console.log(`  Items Lost: ${analysis.summary.itemsLost}`);
        console.log(`  Net Change: ${analysis.summary.netChange}`);
        
        if (acquiredItems.length > 0) {
            console.log(`\nAcquired Items (IDs): ${acquiredItems.join(', ')}`);
        }
        
        return analysis;
        
    } catch (error) {
        console.error(`Error analyzing character differences: ${error.message}`);
        throw error;
    }
};

// Test the analyzer
if (require.main === module) {
    const baseCharacterPath = path.join(__dirname, '../coregamedata/characters/Woods_Girl/Woods_Girl.json');
    const gameStatePath = path.join(__dirname, '../parsed_sessions/learning-woodsgirl/Woods_Girl_game_state.json');
    const outputDir = path.join(__dirname, '../parsed_sessions/learning-woodsgirl');
    
    if (fs.existsSync(baseCharacterPath) && fs.existsSync(gameStatePath)) {
        try {
            const analysis = analyzeCharacterDifferences(baseCharacterPath, gameStatePath, outputDir);
        } catch (error) {
            console.error('Failed to analyze character differences:', error.message);
        }
    } else {
        console.error('Required files not found');
        console.error(`Base character: ${baseCharacterPath} - ${fs.existsSync(baseCharacterPath)}`);
        console.error(`Game state: ${gameStatePath} - ${fs.existsSync(gameStatePath)}`);
    }
}

module.exports = { analyzeCharacterDifferences }; 