const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Import the extraction functions from parse_game_session.js
const { extractCharacterStats, extractScoringData } = require('./parse_game_session.js');

async function extractMissingData(sessionName) {
    console.log(`Extracting missing data for session: ${sessionName}`);
    
    const sessionDir = path.join(__dirname, '../parsed_sessions', sessionName);
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
}

// Get session name from command line argument
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