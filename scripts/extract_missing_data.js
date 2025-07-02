const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Import the extraction functions from parse_game_session.js
const { extractCharacterStats, extractScoringData } = require('./parse_game_session.js');
const { generateSessionName } = require('./generate_session_name.js');

async function injectFollowActions(sessionName) {
    const sessionDir = path.join('/app/public/parsed_sessions', sessionName);
    const xmlPath = path.join(sessionDir, 'extracted_game.xml');
    const jsonPath = path.join(sessionDir, 'parsed_session.json');
    if (!fs.existsSync(xmlPath) || !fs.existsSync(jsonPath)) {
        console.log(`[injectFollowActions] Skipping ${sessionName}: missing XML or JSON`);
        return;
    }
    const xmlData = fs.readFileSync(xmlPath, 'utf8');
    const sessionData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const parser = new xml2js.Parser();
    const parseString = parser.parseString.bind(parser);
    await new Promise((resolve, reject) => {
        parseString(xmlData, (err, result) => {
            if (err) return reject(err);
            const gameObjects = result.game.objects[0].GameObject || [];
            for (const obj of gameObjects) {
                const charName = obj.$.name;
                // Search all AttributeBlocks for attributeList
                const attributeBlocks = obj.AttributeBlock || [];
                for (const block of attributeBlocks) {
                    const attrLists = block.attributeList || [];
                    for (const attrList of attrLists) {
                        const key = attrList.$.keyName; // e.g., month_1_day_4
                        if (!/^month_\d+_day_\d+$/.test(key)) continue;
                        const dayMatch = key.match(/^month_(\d+)_day_(\d+)$/);
                        if (!dayMatch) continue;
                        const dayKey = `${parseInt(dayMatch[1])}_${parseInt(dayMatch[2])}`;
                        if (!sessionData.days[dayKey]) {
                            console.log(`[injectFollowActions] Day ${dayKey} not found in session for ${charName}`);
                            continue;
                        }
                        // Find the turn for this character
                        const turn = sessionData.days[dayKey].characterTurns.find(t => t.character === charName);
                        if (!turn) {
                            console.log(`[injectFollowActions] Turn not found for ${charName} on day ${dayKey}`);
                            continue;
                        }
                        // Look for Follows
                        if (attrList.attributeVal) {
                            for (const attrVal of attrList.attributeVal) {
                                for (const [key, value] of Object.entries(attrVal.$)) {
                                    if (!value) continue;
                                    const followMatch = value.match(/^F\((.+)\)~\d+$/);
                                    if (followMatch) {
                                        const target = followMatch[1];
                                        console.log(`[injectFollowActions] Found follow: ${charName} follows ${target} on day ${dayKey}`);
                                        // Only add if not already present
                                        if (!turn.actions.some(a => a.action === `Followed the ${target}`)) {
                                            turn.actions.push({ action: `Followed the ${target}`, result: "" });
                                            console.log(`[injectFollowActions] Injected follow action for ${charName} on day ${dayKey}`);
                                        } else {
                                            console.log(`[injectFollowActions] Follow action already present for ${charName} on day ${dayKey}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            fs.writeFileSync(jsonPath, JSON.stringify(sessionData, null, 2));
            resolve();
        });
    });
}

async function addIdleAndWaitForArrivalActions(sessionName) {
    const sessionDir = path.join('/app/public/parsed_sessions', sessionName);
    const jsonPath = path.join(sessionDir, 'parsed_session.json');
    if (!fs.existsSync(jsonPath)) return;
    const sessionData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const dayKeys = Object.keys(sessionData.days).sort((a, b) => {
        // Sort by month and day numerically
        const [am, ad] = a.split('_').map(Number);
        const [bm, bd] = b.split('_').map(Number);
        return am !== bm ? am - bm : ad - bd;
    });
    // 1. Add 'Waited Idly' for empty action days
    const allCharacters = Object.keys(sessionData.characterToPlayer);
    for (const char of allCharacters) {
        for (const dayKey of dayKeys) {
            const day = sessionData.days[dayKey];
            const turn = day.characterTurns.find(t => t.character === char);
            if (turn && (!turn.actions || turn.actions.length === 0)) {
                turn.actions = [{ action: 'Waited Idly', result: '' }];
            }
        }
    }
    // 2. Change to 'Waited for the arrival of X' if next day is 'Followed the X'
    for (const char of allCharacters) {
        for (let i = 0; i < dayKeys.length - 1; i++) {
            const dayKey = dayKeys[i];
            const nextDayKey = dayKeys[i + 1];
            const day = sessionData.days[dayKey];
            const nextDay = sessionData.days[nextDayKey];
            const turn = day.characterTurns.find(t => t.character === char);
            const nextTurn = nextDay && nextDay.characterTurns.find(t => t.character === char);
            if (
                turn && turn.actions && turn.actions.length === 1 &&
                turn.actions[0].action === 'Waited Idly' &&
                nextTurn && nextTurn.actions && nextTurn.actions.length > 0
            ) {
                const followAction = nextTurn.actions.find(a => a.action.startsWith('Followed the '));
                if (followAction) {
                    const target = followAction.action.replace('Followed the ', '');
                    turn.actions[0].action = `Waited for the arrival of ${target}`;
                }
            }
        }
    }
    fs.writeFileSync(jsonPath, JSON.stringify(sessionData, null, 2));
}

async function extractMissingData(sessionName) {
    console.log(`Extracting missing data for session: ${sessionName}`);
    
    const sessionDir = path.join('/app/public/parsed_sessions', sessionName);
    const xmlPath = path.join(sessionDir, 'extracted_game.xml');
    
    if (!fs.existsSync(xmlPath)) {
        console.error(`XML file not found: ${xmlPath}`);
        return;
    }
    
    console.log(`Found XML file: ${xmlPath}`);
    
    // Extract character stats
    const statsPath = path.join(sessionDir, 'character_stats.json');
    if (!fs.existsSync(statsPath)) {
        console.log('Extracting character stats...');
        try {
            extractCharacterStats(xmlPath, statsPath);
            console.log(`✓ Character stats extracted to: ${path.basename(statsPath)}`);
        } catch (error) {
            console.error(`✗ Error extracting character stats: ${error.message}`);
        }
    } else {
        console.log('Character stats already exist');
    }
    
    // Extract scoring data
    const scoringPath = path.join(sessionDir, 'scoring.json');
    if (!fs.existsSync(scoringPath)) {
        console.log('Extracting scoring data...');
        try {
            await extractScoringData(xmlPath, scoringPath);
            console.log(`✓ Scoring data extracted to: ${path.basename(scoringPath)}`);
        } catch (error) {
            console.error(`✗ Error extracting scoring data: ${error.message}`);
        }
    } else {
        console.log('Scoring data already exists');
    }
    
    console.log(`✅ Missing data extraction complete for ${sessionName}`);
    // Inject follow actions after all other extraction steps
    await injectFollowActions(sessionName);
    await addIdleAndWaitForArrivalActions(sessionName);

    // Generate and store session titles
    const parsedSessionPath = path.join(sessionDir, 'parsed_session.json');
    const mapLocationsPath = path.join(sessionDir, 'map_locations.json');
    const finalScoresPath = path.join(sessionDir, 'final_scores.json');
    if (fs.existsSync(parsedSessionPath) && fs.existsSync(mapLocationsPath) && fs.existsSync(finalScoresPath)) {
        const sessionData = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
        const mapLocations = JSON.parse(fs.readFileSync(mapLocationsPath, 'utf8'));
        const finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
        const titles = generateSessionName(sessionData, mapLocations, finalScores);
        fs.writeFileSync(path.join(sessionDir, 'session_titles.json'), JSON.stringify(titles, null, 2));
        console.log(`✓ Session titles generated and saved for ${sessionName}`);
    }
}

if (require.main === module) {
    const sessionName = process.argv[2];
    if (!sessionName) {
        console.error('Usage: node extract_missing_data.js <session-name>');
        console.error('Example: node extract_missing_data.js learning-woodsgirl');
        process.exit(1);
    }
    extractMissingData(sessionName).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { extractMissingData, injectFollowActions, addIdleAndWaitForArrivalActions }; 