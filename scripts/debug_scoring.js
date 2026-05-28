const fs = require('fs');
const xml2js = require('xml2js');

function debugScoringData(xmlFilePath) {
    console.log(`Debugging scoring data from ${xmlFilePath}...`);
    
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    const parser = new xml2js.Parser();
    
    parser.parseString(xmlData, (err, result) => {
        if (err) {
            console.error('Error parsing XML:', err);
            return;
        }
        
        const gameObjects = result.game.GameObject || [];
        console.log(`Found ${gameObjects.length} game objects`);
        
        let characterCount = 0;
        let rsPbCount = 0;
        let vrCount = 0;
        
        gameObjects.forEach((gameObject, index) => {
            const id = gameObject.$.id;
            const name = gameObject.$.name;
            
            // Check if this is a character
            const thisBlock = gameObject.AttributeBlock?.find(block => block.$.blockName === 'this');
            if (thisBlock) {
                const characterAttr = thisBlock.attribute?.find(attr => attr.$.character);
                if (characterAttr) {
                    characterCount++;
                    console.log(`Character ${characterCount}: ${name} (ID: ${id})`);
                    
                    // Look for RS_PB__ and VR__ blocks
                    const rsPbBlock = gameObject.AttributeBlock?.find(block => block.$.blockName === 'RS_PB__');
                    const vrBlock = gameObject.AttributeBlock?.find(block => block.$.blockName === 'VR__');
                    
                    if (rsPbBlock) {
                        rsPbCount++;
                        console.log(`  Has RS_PB__ block`);
                        
                        // Check for stgold__ attribute
                        const stgoldAttr = rsPbBlock.attribute?.find(attr => attr.$.stgold__);
                        if (stgoldAttr) {
                            console.log(`  Starting gold: ${stgoldAttr.$.stgold__}`);
                        }
                    }
                    
                    if (vrBlock) {
                        vrCount++;
                        console.log(`  Has VR__ block`);
                        
                        // Check for victory point attributes
                        const gtAttr = vrBlock.attribute?.find(attr => attr.$.gt);
                        const usAttr = vrBlock.attribute?.find(attr => attr.$.us);
                        const fAttr = vrBlock.attribute?.find(attr => attr.$.f);
                        const nAttr = vrBlock.attribute?.find(attr => attr.$.n);
                        const gAttr = vrBlock.attribute?.find(attr => attr.$.g);
                        
                        if (gtAttr) console.log(`  GT: ${gtAttr.$.gt}`);
                        if (usAttr) console.log(`  US: ${usAttr.$.us}`);
                        if (fAttr) console.log(`  F: ${fAttr.$.f}`);
                        if (nAttr) console.log(`  N: ${nAttr.$.n}`);
                        if (gAttr) console.log(`  G: ${gAttr.$.g}`);
                    }
                    
                    if (!rsPbBlock && !vrBlock) {
                        console.log(`  No RS_PB__ or VR__ blocks found`);
                    }
                }
            }
        });
        
        console.log(`\nSummary:`);
        console.log(`Total characters: ${characterCount}`);
        console.log(`Characters with RS_PB__: ${rsPbCount}`);
        console.log(`Characters with VR__: ${vrCount}`);
    });
}

// Debug 5man session
const inputFile = 'parsed_sessions/5man/extracted_game.xml';

if (fs.existsSync(inputFile)) {
    debugScoringData(inputFile);
} else {
    console.error(`Input file not found: ${inputFile}`);
} 