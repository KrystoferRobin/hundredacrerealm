const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function processAllSessions() {
  console.log('🎮 Magic Realm - Process All Sessions');
  console.log('=====================================\n');
  
  const uploadsDir = path.join(__dirname, '../public/uploads');
  
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
  
  console.log(`Found ${sessionNames.size} session(s) to process:`);
  Array.from(sessionNames).forEach(name => console.log(`  - ${name}`));
  
  console.log('\n=== Processing Sessions ===\n');
  
  for (const sessionName of sessionNames) {
    console.log(`\n--- Processing: ${sessionName} ---`);
    
    try {
      // Step 1: Run the main session parser (handles both .rslog and .rsgame)
      console.log('1. Running main session parser...');
      execSync(`node parse_game_session.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      // Step 2: Run the detailed log parser to generate parsed_session.json
      console.log('2. Running detailed log parser...');
      execSync(`node parse_game_log_detailed.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      // Step 3: Run the map parser to extract map data
      console.log('3. Running map parser...');
      execSync(`node parse_map_data.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      // Step 4: Extract character inventories
      console.log('4. Extracting character inventories...');
      execSync(`node extract_character_inventories.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      // Step 5: Calculate final scores
      console.log('5. Calculating final scores...');
      execSync(`node calculate_scoring.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      
      console.log(`✅ ${sessionName} processed successfully!`);
      
    } catch (error) {
      console.error(`❌ Error processing ${sessionName}:`, error.message);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Processed ${sessionNames.size} session(s):`);
  Array.from(sessionNames).forEach(name => {
    const sessionDir = path.join(__dirname, '../parsed_sessions', name);
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      console.log(`  - ${name}: ${files.length} files`);
    } else {
      console.log(`  - ${name}: Failed to process`);
    }
  });
  
  console.log('\n✅ All sessions processed!');
  console.log('\nNext steps:');
  console.log('1. Check the parsed_sessions directory for generated files');
  console.log('2. Sessions should now appear in the Recent Game Sessions panel');
  console.log('3. You can view individual sessions on the site');
}

// Run if called directly
if (require.main === module) {
  processAllSessions().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processAllSessions }; 