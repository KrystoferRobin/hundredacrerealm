#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function addScoringToAllSessions() {
  console.log('🎮 Adding Scoring Data to All Sessions');
  console.log('=====================================\n');
  
  const parsedSessionsDir = path.join(__dirname, '../parsed_sessions');
  
  if (!fs.existsSync(parsedSessionsDir)) {
    console.log('No parsed_sessions directory found.');
    return;
  }
  
  const sessionDirs = fs.readdirSync(parsedSessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith('.') && name !== 'Users'); // Skip hidden files and Users dir
  
  if (sessionDirs.length === 0) {
    console.log('No session directories found.');
    return;
  }
  
  console.log(`Found ${sessionDirs.length} session(s) to process:`);
  sessionDirs.forEach(name => console.log(`  - ${name}`));
  
  console.log('\n=== Processing Sessions ===\n');
  
  for (const sessionName of sessionDirs) {
    console.log(`\n--- Processing: ${sessionName} ---`);
    
    try {
      const sessionDir = path.join(parsedSessionsDir, sessionName);
      const xmlPath = path.join(sessionDir, 'extracted_game.xml');
      
      // Check if session has XML file (required for scoring)
      if (!fs.existsSync(xmlPath)) {
        console.log(`  ⚠️  No XML file found, skipping...`);
        continue;
      }
      
      // Check if scoring data already exists
      const finalScoresPath = path.join(sessionDir, 'final_scores.json');
      if (fs.existsSync(finalScoresPath)) {
        console.log(`  ✅ Scoring data already exists`);
        continue;
      }
      
      // Extract missing data if needed
      const statsPath = path.join(sessionDir, 'character_stats.json');
      const scoringPath = path.join(sessionDir, 'scoring.json');
      const inventoriesPath = path.join(sessionDir, 'character_inventories.json');
      
      if (!fs.existsSync(statsPath) || !fs.existsSync(scoringPath)) {
        console.log('  📊 Extracting missing data...');
        execSync(`node scripts/extract_missing_data.js ${sessionName}`, { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
      }
      
      if (!fs.existsSync(inventoriesPath)) {
        console.log('  🎒 Extracting character inventories...');
        execSync(`node scripts/extract_character_inventories.js ${sessionName}`, { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
      }
      
      // Calculate final scores
      console.log('  🏆 Calculating final scores...');
      execSync(`node scripts/calculate_scoring.js ${sessionName}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log(`  ✅ ${sessionName} processed successfully!`);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${sessionName}:`, error.message);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Processed ${sessionDirs.length} session(s):`);
  sessionDirs.forEach(name => {
    const sessionDir = path.join(parsedSessionsDir, name);
    const finalScoresPath = path.join(sessionDir, 'final_scores.json');
    if (fs.existsSync(finalScoresPath)) {
      console.log(`  ✅ ${name}: Scoring data available`);
    } else {
      console.log(`  ❌ ${name}: No scoring data`);
    }
  });
  
  console.log('\n✅ All sessions processed!');
  console.log('\nNext steps:');
  console.log('1. Check the session viewer to see scores for each character');
  console.log('2. Scores are now available via the API at /api/session/{id}/final-scores');
}

// Run if called directly
if (require.main === module) {
  addScoringToAllSessions().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { addScoringToAllSessions }; 