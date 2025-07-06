const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to resolve paths for Docker or local
function resolveAppPath(subPath) {
  if (process.env.IS_DOCKER === '1') {
    return `/app/${subPath}`;
  }
  return require('path').join(__dirname, '..', subPath);
}

async function reprocessExistingSessions() {
  console.log('🎮 Magic Realm - Reprocess Existing Sessions');
  console.log('============================================');
  
  const parsedSessionsDir = resolveAppPath('public/parsed_sessions');
  
  if (!fs.existsSync(parsedSessionsDir)) {
    console.log('No parsed_sessions directory found.');
    return;
  }
  
  const sessionDirs = fs.readdirSync(parsedSessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith('.'));
  
  if (sessionDirs.length === 0) {
    console.log('No session directories found.');
    return;
  }
  
  console.log(`Found ${sessionDirs.length} session(s) to reprocess:`);
  sessionDirs.forEach(name => console.log(`  - ${name}`));
  
  console.log('\n=== Reprocessing Sessions ===\n');
  
  for (const sessionName of sessionDirs) {
    console.log(`\n--- Reprocessing: ${sessionName} ---`);
    
    const originalCwd = process.cwd();
    
    try {
      const sessionDir = path.join(parsedSessionsDir, sessionName);
      
      // Change to session directory
      process.chdir(sessionDir);
      
      // Check what files exist
      const files = fs.readdirSync('.');
      const hasRslog = files.some(f => f.endsWith('.rslog'));
      const hasRsgame = files.some(f => f.endsWith('.rsgame'));
      const hasParsedSession = files.includes('parsed_session.json');
      const hasCharacterInventories = files.includes('character_inventories.json');
      const hasExtractedGame = files.includes('extracted_game.xml');
      
      console.log(`  Files found: ${files.join(', ')}`);
      
      // Run game parser if we have .rsgame and no extracted_game.xml
      if (hasRsgame && !hasExtractedGame) {
        console.log('  🎯 Running game parser...');
        const rsgameFile = files.find(f => f.endsWith('.rsgame'));
        execSync(`node ${resolveAppPath('scripts/parse_game_session.js')} ${rsgameFile}`, { stdio: 'inherit' });
      } else if (hasExtractedGame) {
        console.log('  ✅ extracted_game.xml already exists');
      } else if (!hasRsgame) {
        console.log('  ⚠️  No .rsgame file found, skipping game parsing');
      }
      
      // Run detailed log parser if we have .rslog and no parsed_session.json
      if (hasRslog && !hasParsedSession) {
        console.log('  📄 Running detailed log parser...');
        execSync(`node ${resolveAppPath('scripts/parse_game_log_detailed.js')}`, { stdio: 'inherit' });
      } else if (hasParsedSession) {
        console.log('  ✅ parsed_session.json already exists');
      } else {
        console.log('  ⚠️  No .rslog file found, skipping log parsing');
      }
      
      // Run character inventories extraction if we have parsed_session.json but no character_inventories.json
      if (hasParsedSession && !hasCharacterInventories) {
        console.log('  🎒 Running character inventories extraction...');
        execSync(`node ${resolveAppPath('scripts/extract_character_inventories.js')}`, { stdio: 'inherit' });
      } else if (hasCharacterInventories) {
        console.log('  ✅ character_inventories.json already exists');
      } else {
        console.log('  ⚠️  No parsed_session.json found, skipping inventory extraction');
      }
      
      // Run scoring calculation if we have the required files
      const hasScoring = files.includes('scoring.json');
      const hasStats = files.includes('character_stats.json');
      const hasFinalScores = files.includes('final_scores.json');
      
      if (hasScoring && hasStats && hasCharacterInventories && !hasFinalScores) {
        console.log('  🏆 Running scoring calculation...');
        execSync(`node ${resolveAppPath('scripts/calculate_scoring.js')}`, { stdio: 'inherit' });
      } else if (hasFinalScores) {
        console.log('  ✅ final_scores.json already exists');
      } else {
        console.log('  ⚠️  Missing required files for scoring calculation');
      }
      
      // Generate session titles if we have the required files
      const hasMapLocations = files.includes('map_locations.json');
      const hasSessionTitles = files.includes('session_titles.json');
      
      if (hasParsedSession && hasMapLocations && hasFinalScores && !hasSessionTitles) {
        console.log('  📝 Generating session titles...');
        execSync(`node ${resolveAppPath('scripts/generate_session_titles.js')}`, { stdio: 'inherit' });
      } else if (hasSessionTitles) {
        console.log('  ✅ session_titles.json already exists');
      } else {
        console.log('  ⚠️  Missing required files for session title generation');
      }
      
      console.log(`  ✅ ${sessionName} reprocessed successfully!`);
      
    } catch (error) {
      console.error(`  ❌ Error reprocessing ${sessionName}:`, error.message);
    } finally {
      // Always return to original directory
      process.chdir(originalCwd);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Reprocessed ${sessionDirs.length} session(s):`);
  sessionDirs.forEach(name => {
    const sessionDir = path.join(parsedSessionsDir, name);
    const files = fs.readdirSync(sessionDir);
    const hasParsedSession = files.includes('parsed_session.json');
    const hasCharacterInventories = files.includes('character_inventories.json');
    const hasFinalScores = files.includes('final_scores.json');
    const hasSessionTitles = files.includes('session_titles.json');
    
    if (hasParsedSession && hasCharacterInventories && hasFinalScores && hasSessionTitles) {
      console.log(`  ✅ ${name}: Complete`);
    } else {
      console.log(`  ⚠️  ${name}: Incomplete (missing: ${[
        !hasParsedSession && 'parsed_session.json',
        !hasCharacterInventories && 'character_inventories.json',
        !hasFinalScores && 'final_scores.json',
        !hasSessionTitles && 'session_titles.json'
      ].filter(Boolean).join(', ')})`);
    }
  });
  
  console.log('\n✅ All sessions reprocessed!');
  console.log('\nNext steps:');
  console.log('1. Run "Build Master Stats" to update global statistics');
  console.log('2. Run "Generate Session Titles" to update session titles');
  console.log('3. Check the session viewer to see complete data');
}

// Run if called directly
if (require.main === module) {
  reprocessExistingSessions().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { reprocessExistingSessions }; 