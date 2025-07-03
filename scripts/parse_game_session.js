const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Add error handling for module loading
let xml2js;
try {
    xml2js = require('xml2js');
} catch (error) {
    console.error('Error loading xml2js:', error.message);
    process.exit(1);
}

// Import our parsers with error handling
let extractRsgameXml, extractMapLocations, extractCharacterStats;
try {
    extractRsgameXml = require('./parse_rsgame_map.js').extractRsgameXml;
    extractMapLocations = require('./extract_map_locations.js').extractMapLocations;
    extractCharacterStats = require('./extract_character_stats.js').extractCharacterStats;
} catch (error) {
    console.error('Error loading parser modules:', error.message);
    process.exit(1);
}

const findGameFiles = (uploadsDir) => {
    console.log(`Searching for game files in: ${uploadsDir}`);
    
    const gameFiles = [];
    
    if (!fs.existsSync(uploadsDir)) {
        console.log(`Uploads directory not found: ${uploadsDir}`);
        return gameFiles;
    }
    
    const files = fs.readdirSync(uploadsDir);
    
    // Group files by base name (without extension)
    const fileGroups = {};
    
    files.forEach(file => {
        if (file.endsWith('.rslog') || file.endsWith('.rsgame')) {
            const baseName = file.replace(/\.(rslog|rsgame)$/, '');
            
            if (!fileGroups[baseName]) {
                fileGroups[baseName] = {};
            }
            
            if (file.endsWith('.rslog')) {
                fileGroups[baseName].rslog = file;
            } else if (file.endsWith('.rsgame')) {
                fileGroups[baseName].rsgame = file;
            }
        }
    });
    
    // Convert to array format
    Object.entries(fileGroups).forEach(([baseName, files]) => {
        if (files.rslog || files.rsgame) {
            gameFiles.push({
                baseName,
                rslog: files.rslog ? path.join(uploadsDir, files.rslog) : null,
                rsgame: files.rsgame ? path.join(uploadsDir, files.rsgame) : null
            });
        }
    });
    
    return gameFiles;
};

const parseGameLog = (logPath, outputDir) => {
    console.log(`📄 Log file found: ${path.basename(logPath)} (will be processed by master script)`);
};

const extractScoringData = (xmlFilePath, outputFilePath) => {
    console.log(`Extracting scoring data from ${path.basename(xmlFilePath)}...`);
    
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
    const parser = new xml2js.Parser();
    
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                reject(err);
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
            console.log(`✓ Scoring data extracted to: ${path.basename(outputFilePath)}`);
            console.log(`  Found ${Object.keys(scoringData).length} characters with scoring data`);
            
            resolve(scoringData);
        });
    });
};

const processGameSession = async (sessionNameOrFile) => {
    let sessionFile = sessionNameOrFile;
    let sessionName = null;
    // If no argument, use first .rslog or .rsgame in current directory
    if (!sessionFile) {
        const files = fs.readdirSync('.');
        sessionFile = files.find(f => f.endsWith('.rslog') || f.endsWith('.rsgame'));
        if (!sessionFile) {
            console.error('No .rslog or .rsgame file found in current directory.');
            process.exit(1);
        }
        sessionName = sessionFile.replace(/\.(rslog|rsgame)$/,'');
    } else {
        sessionName = sessionFile.replace(/\.(rslog|rsgame)$/,'');
            }
    const outputDir = '.';
    console.log(`\n=== Processing session: ${sessionName} ===\n`);
    // Only use files in the current directory
    const rslogPath = `${sessionName}.rslog`;
    const rsgamePath = `${sessionName}.rsgame`;
    const hasRslog = fs.existsSync(rslogPath);
    const hasRsgame = fs.existsSync(rsgamePath);
    if (!hasRslog && !hasRsgame) {
        console.log(`No .rslog or .rsgame files found for session: ${sessionName}`);
        return;
    }
    console.log(`Session files found:`);
    if (hasRslog) console.log(`  📄 Log: ${rslogPath}`);
    if (hasRsgame) console.log(`  🎯 Game: ${rsgamePath}`);
    
    // Step 1: Extract .rsgame XML if it exists
    let xmlPath = null;
    if (hasRsgame) {
        console.log(`Extracting game XML: ${rsgamePath}`);
        try {
            xmlPath = extractRsgameXml(rsgamePath, outputDir);
            console.log(`✓ Game XML extracted to: ${path.basename(xmlPath)}`);
        } catch (error) {
            console.error(`✗ Error extracting game XML: ${error.message}`);
        }
    } else {
        console.log('No .rsgame file found');
    }
    
    // Step 2: Extract map locations if XML exists
    if (xmlPath && fs.existsSync(xmlPath)) {
        const mapLocPath = path.join(outputDir, 'map_locations.json');
        await extractMapLocations(xmlPath, mapLocPath);
        
        // Step 3: Extract character stats if XML exists
        const statsPath = path.join(outputDir, 'character_stats.json');
        try {
            extractCharacterStats(xmlPath, statsPath);
        } catch (error) {
            console.error(`✗ Error extracting character stats: ${error.message}`);
        }
        
        // Step 4: Extract scoring data if XML exists
        const scoringPath = path.join(outputDir, 'scoring.json');
        try {
            await extractScoringData(xmlPath, scoringPath);
        } catch (error) {
            console.error(`✗ Error extracting scoring data: ${error.message}`);
        }
    }
    
    // Step 5: Note log file if it exists
    if (hasRslog) {
        parseGameLog(rslogPath, outputDir);
    } else {
        console.log('No .rslog file found');
    }
    
    console.log(`Session data saved to: ${outputDir}`);
};

const main = async () => {
    const arg = process.argv[2];
    await processGameSession(arg);
};

if (require.main === module) {
    main();
}

module.exports = { findGameFiles, processGameSession, extractCharacterStats, extractScoringData }; 