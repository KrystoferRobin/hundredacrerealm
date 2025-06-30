const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import our parsers
const { extractRsgameXml } = require('./parse_rsgame_map.js');

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

const processGameSession = async (sessionName) => {
    console.log(`\n=== Processing session: ${sessionName} ===\n`);
    
    // Check if the session files exist
    const rslogPath = path.join(__dirname, '../public/uploads', `${sessionName}.rslog`);
    const rsgamePath = path.join(__dirname, '../public/uploads', `${sessionName}.rsgame`);
    
    const hasRslog = fs.existsSync(rslogPath);
    const hasRsgame = fs.existsSync(rsgamePath);
    
    if (!hasRslog && !hasRsgame) {
        console.log(`No .rslog or .rsgame files found for session: ${sessionName}`);
        return;
    }
    
    console.log(`Session files found:`);
    if (hasRslog) console.log(`  📄 Log: ${sessionName}.rslog`);
    if (hasRsgame) console.log(`  🎯 Game: ${sessionName}.rsgame`);
    
    // Create output directory
    const outputDir = path.join(__dirname, '../parsed_sessions', sessionName);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Step 1: Extract .rsgame XML if it exists
    if (hasRsgame) {
        console.log(`Extracting game XML: ${sessionName}.rsgame`);
        try {
            const xmlPath = extractRsgameXml(rsgamePath, outputDir);
            console.log(`✓ Game XML extracted to: ${path.basename(xmlPath)}`);
        } catch (error) {
            console.error(`✗ Error extracting game XML: ${error.message}`);
        }
    } else {
        console.log('No .rsgame file found');
    }
    
    // Step 1: Note log file if it exists
    if (hasRslog) {
        parseGameLog(rslogPath, outputDir);
    } else {
        console.log('No .rslog file found');
    }
    
    console.log(`Session data saved to: ${outputDir}`);
};

const main = async () => {
    const uploadsDir = path.join(__dirname, '../public/uploads');
    
    console.log('🎮 Magic Realm Game Session Parser');
    console.log('=====================================\n');
    
    // Get session name from command line argument
    const sessionName = process.argv[2];
    if (!sessionName) {
        console.error('Usage: node parse_game_session.js <session-name>');
        console.error('Example: node parse_game_session.js learning-woodsgirl');
        console.error('\nOr run without arguments to process all sessions in uploads directory');
        
        // If no session name provided, process all sessions
        if (!fs.existsSync(uploadsDir)) {
            console.log('No uploads directory found.');
            return;
        }
        
        const files = fs.readdirSync(uploadsDir);
        const sessionNames = new Set();
        
        files.forEach(file => {
            if (file.endsWith('.rslog') || file.endsWith('.rsgame')) {
                const baseName = file.replace(/\.(rslog|rsgame)$/, '');
                sessionNames.add(baseName);
            }
        });
        
        if (sessionNames.size === 0) {
            console.log('No game files found. Please place .rslog and/or .rsgame files in the uploads directory.');
            return;
        }
        
        console.log(`\nFound ${sessionNames.size} session(s) to process:`);
        Array.from(sessionNames).forEach(name => console.log(`  - ${name}`));
        
        // Process all sessions
        for (const name of sessionNames) {
            await processGameSession(name);
        }
    } else {
        // Process specific session
        await processGameSession(sessionName);
    }
    
    console.log('\n✅ All game sessions processed successfully!');
    console.log('\nNext steps:');
    console.log('1. Examine the extracted XML files in the parsed_sessions folders');
    console.log('2. Update the map parser to extract the specific data you need');
    console.log('3. Combine log and game data into unified session files');
};

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { findGameFiles, processGameSession }; 