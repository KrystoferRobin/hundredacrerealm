const fs = require('fs');
const xml2js = require('xml2js');

function extractScoringData(xmlFilePath, outputFilePath) {
    console.log(`Extracting scoring data from ${xmlFilePath}...`);
    
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    const parser = new xml2js.Parser();
    
    parser.parseString(xmlData, (err, result) => {
        if (err) {
            console.error('Error parsing XML:', err);
            return;
        }
        
        const gameObjects = result.game.objects[0].GameObject || [];
        const scoringData = {};
        
        gameObjects.forEach(gameObject => {
            const id = gameObject.$.id;
            const name = gameObject.$.name;
            
            // Look for character blocks (RS_PB__ indicates a player character)
            const rsPbBlock = gameObject.AttributeBlock?.find(block => block.$.blockName === 'RS_PB__');
            const vrBlock = gameObject.AttributeBlock?.find(block => block.$.blockName === 'VR__');
            
            if (rsPbBlock) {
                // This is a character with player data
                const characterData = {
                    id: id,
                    name: name,
                    startingGold: 0,
                    victoryPoints: {
                        greatTreasures: 0,
                        spells: 0,
                        fame: 0,
                        notoriety: 0,
                        gold: 0
                    }
                };
                
                // Extract starting gold deficit
                const stgoldAttr = rsPbBlock.attribute?.find(attr => attr.$.stgold__);
                if (stgoldAttr) {
                    characterData.startingGold = parseInt(stgoldAttr.$.stgold__) || 0;
                }
                
                // Extract victory point assignments
                if (vrBlock) {
                    const gtAttr = vrBlock.attribute?.find(attr => attr.$.gt);
                    const usAttr = vrBlock.attribute?.find(attr => attr.$.us);
                    const fAttr = vrBlock.attribute?.find(attr => attr.$.f);
                    const nAttr = vrBlock.attribute?.find(attr => attr.$.n);
                    const gAttr = vrBlock.attribute?.find(attr => attr.$.g);
                    
                    if (gtAttr) characterData.victoryPoints.greatTreasures = parseInt(gtAttr.$.gt) || 0;
                    if (usAttr) characterData.victoryPoints.spells = parseInt(usAttr.$.us) || 0;
                    if (fAttr) characterData.victoryPoints.fame = parseInt(fAttr.$.f) || 0;
                    if (nAttr) characterData.victoryPoints.notoriety = parseInt(nAttr.$.n) || 0;
                    if (gAttr) characterData.victoryPoints.gold = parseInt(gAttr.$.g) || 0;
                }
                
                scoringData[name] = characterData;
            }
        });
        
        // Write to JSON file
        fs.writeFileSync(outputFilePath, JSON.stringify(scoringData, null, 2));
        console.log(`Scoring data extracted to ${outputFilePath}`);
        console.log(`Found ${Object.keys(scoringData).length} characters with scoring data`);
        
        // Print summary
        Object.entries(scoringData).forEach(([name, data]) => {
            console.log(`${name}:`);
            console.log(`  Starting Gold Deficit: ${data.startingGold}`);
            console.log(`  Victory Points: GT=${data.victoryPoints.greatTreasures}, S=${data.victoryPoints.spells}, F=${data.victoryPoints.fame}, N=${data.victoryPoints.notoriety}, G=${data.victoryPoints.gold}`);
        });
    });
}

// Extract from 5man session
const inputFile = 'parsed_sessions/5man/extracted_game.xml';
const outputFile = 'parsed_sessions/5man/scoring.json';

if (fs.existsSync(inputFile)) {
    extractScoringData(inputFile, outputFile);
} else {
    console.error(`Input file not found: ${inputFile}`);
} 