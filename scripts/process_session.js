#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

function processSession(sessionName) {
  console.log(`🎮 Processing Magic Realm Session: ${sessionName}`);
  console.log('=====================================\n');
  
  try {
    // Step 1: Extract game XML and note log file
    console.log('1. Extracting game data...');
    execSync(`node scripts/parse_game_session.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Step 1.5: Extract missing data if needed (for sessions without .rslog/.rsgame files)
    console.log('\n1.5. Extracting missing data...');
    execSync(`node scripts/extract_missing_data.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Step 2: Parse log file into detailed session data
    console.log('\n2. Parsing log file...');
    execSync(`node scripts/parse_game_log_detailed.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Step 3: Extract map data
    console.log('\n3. Extracting map data...');
    execSync(`node scripts/parse_map_data.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Step 4: Extract character inventories
    console.log('\n4. Extracting character inventories...');
    execSync(`node scripts/extract_character_inventories.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Step 5: Calculate final scores
    console.log('\n5. Calculating final scores...');
    execSync(`node scripts/calculate_scoring.js ${sessionName}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(`\n✅ Session "${sessionName}" processed successfully!`);
    console.log(`\nGenerated files:`);
    console.log(`  - public/parsed_sessions/${sessionName}/extracted_game.xml`);
    console.log(`  - public/parsed_sessions/${sessionName}/parsed_session.json`);
    console.log(`  - public/parsed_sessions/${sessionName}/map_data.json`);
    console.log(`  - public/parsed_sessions/${sessionName}/character_stats.json`);
    console.log(`  - public/parsed_sessions/${sessionName}/scoring.json`);
    console.log(`  - public/parsed_sessions/${sessionName}/character_inventories.json`);
    console.log(`  - public/parsed_sessions/${sessionName}/day_*.txt (103 day files)`);
    
  } catch (error) {
    console.error(`❌ Error processing session "${sessionName}":`, error.message);
    process.exit(1);
  }
}

// Get session name from command line argument
const sessionName = process.argv[2];
if (!sessionName) {
  console.error('Usage: node scripts/process_session.js <session-name>');
  console.error('Example: node scripts/process_session.js learning-woodsgirl');
  console.error('\nThis will process a single session and generate all necessary files.');
  process.exit(1);
}

processSession(sessionName); 