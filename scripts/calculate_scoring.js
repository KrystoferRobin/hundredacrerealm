const fs = require('fs');
const path = require('path');

function calculateScoring(sessionId) {
    console.log(`Calculating scoring for session: ${sessionId}`);
    
    const sessionDir = path.join(__dirname, '../parsed_sessions', sessionId);
    const scoringPath = path.join(sessionDir, 'scoring.json');
    const statsPath = path.join(sessionDir, 'character_stats.json');
    const inventoriesPath = path.join(sessionDir, 'character_inventories.json');
    
    if (!fs.existsSync(scoringPath) || !fs.existsSync(statsPath) || !fs.existsSync(inventoriesPath)) {
        console.error('Required files not found');
        return;
    }
    
    const scoringData = JSON.parse(fs.readFileSync(scoringPath, 'utf8'));
    const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const inventoriesData = JSON.parse(fs.readFileSync(inventoriesPath, 'utf8'));
    
    const results = {};
    
    Object.keys(scoringData).forEach(characterName => {
        if (characterName.includes('HQ')) return; // Skip headquarters
        
        const scoring = scoringData[characterName];
        const stats = statsData[characterName];
        const inventory = inventoriesData[characterName];
        
        if (!stats || !inventory) {
            console.log(`Missing data for ${characterName}`);
            return;
        }
        
        console.log(`\n=== ${characterName} ===`);
        console.log(`Starting Gold Deficit: ${scoring.startingGold}`);
        
        // Calculate sum of item fame and notoriety
        let itemFame = 0;
        let itemNotoriety = 0;
        if (inventory.items && inventory.items.other) {
            inventory.items.other.forEach(item => {
                if (item.data && item.data.attributeBlocks && item.data.attributeBlocks.this) {
                    const attrs = item.data.attributeBlocks.this;
                    
                    // Only include fame if it's not faction-specific (no native field) or if it's negative
                    // Faction-specific positive fame is only awarded when sold to that faction
                    if (attrs.fame) {
                        const fameValue = parseInt(attrs.fame) || 0;
                        const hasNative = attrs.native && attrs.native !== "";
                        
                        // Include if negative fame (always applies) or if no native faction (always applies)
                        if (fameValue < 0 || !hasNative) {
                            itemFame += fameValue;
                        }
                        // Skip positive fame with native faction (only applies when sold)
                    }
                    
                    // Only include notoriety if it's not faction-specific (no native field) or if it's negative
                    // Faction-specific positive notoriety is only awarded when sold to that faction
                    if (attrs.notoriety) {
                        const notorietyValue = parseInt(attrs.notoriety) || 0;
                        const hasNative = attrs.native && attrs.native !== "";
                        
                        // Include if negative notoriety (always applies) or if no native faction (always applies)
                        if (notorietyValue < 0 || !hasNative) {
                            itemNotoriety += notorietyValue;
                        }
                        // Skip positive notoriety with native faction (only applies when sold)
                    }
                }
            });
        }
        
        // Use correct values for great treasures and learned spells from stats if available
        const greatTreasuresActual = stats.greatTreasures !== undefined ? stats.greatTreasures : (inventory.items.great_treasures ? inventory.items.great_treasures.length : 0);
        const learnedSpellsActual = stats.learnedSpells !== undefined ? stats.learnedSpells : (inventory.items.spells ? inventory.items.spells.length : 0);
        
        // Calculate each category
        const categories = {
            greatTreasures: {
                actual: greatTreasuresActual,
                required: scoring.victoryPoints.greatTreasures,
                factor: 1
            },
            spells: {
                actual: learnedSpellsActual,
                required: scoring.victoryPoints.spells * 2, // 2 spells per point
                factor: 2
            },
            fame: {
                actual: stats.fame + itemFame, // Add item fame to XML fame
                required: scoring.victoryPoints.fame * 10,
                factor: 10
            },
            notoriety: {
                actual: stats.notoriety + itemNotoriety, // Add item notoriety to XML notoriety
                required: scoring.victoryPoints.notoriety * 20,
                factor: 20
            },
            gold: {
                actual: stats.gold - scoring.startingGold, // Subtract starting deficit
                required: scoring.victoryPoints.gold * 30,
                factor: 30
            }
        };
        
        let totalBasicScore = 0;
        let totalBonusScore = 0;
        
        Object.entries(categories).forEach(([category, data]) => {
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  Actual: ${data.actual}`);
            console.log(`  Required: ${data.required}`);
            
            let score = data.actual - data.required;
            console.log(`  Raw Score: ${score}`);
            
            // Apply penalty if negative
            if (score < 0) {
                score = score * 3;
                console.log(`  After Penalty: ${score}`);
            }
            
            // Calculate basic score
            const basicScore = Math.floor(score / data.factor);
            console.log(`  Basic Score: ${basicScore} (${score} ÷ ${data.factor})`);
            
            // Calculate bonus score
            const bonusScore = basicScore * scoring.victoryPoints[category];
            console.log(`  Bonus Score: ${bonusScore} (${basicScore} × ${scoring.victoryPoints[category]})`);
            
            totalBasicScore += basicScore;
            totalBonusScore += bonusScore;
        });
        
        const totalScore = totalBasicScore + totalBonusScore;
        
        console.log(`\nTOTAL SCORE: ${totalScore}`);
        console.log(`  Basic: ${totalBasicScore}`);
        console.log(`  Bonus: ${totalBonusScore}`);
        
        results[characterName] = {
            totalScore,
            totalBasicScore,
            totalBonusScore,
            categories,
            itemFame,
            itemNotoriety
        };
    });
    
    // Save results to file
    const resultsPath = path.join(sessionDir, 'final_scores.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nFinal scores saved to: ${resultsPath}`);
    
    return results;
}

// Calculate for session specified in command line
const sessionId = process.argv[2];
if (!sessionId) {
    console.error('Usage: node calculate_scoring.js <session-id>');
    console.error('Example: node calculate_scoring.js 5man');
    process.exit(1);
}

calculateScoring(sessionId); 