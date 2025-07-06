const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// const { getWebhook } = require('./discord_webhook'); // DISCORD WEBHOOKS DISABLED - Use admin panel instead

// Helper to resolve paths for Docker or local
// Uses IS_DOCKER=1 env var (set in Docker Compose) to determine mode
function resolveAppPath(subPath) {
  if (process.env.IS_DOCKER === '1') {
    // In Docker, /app is the working directory
    return `/app/${subPath}`;
  }
  // Local dev: resolve relative to project root
  return require('path').join(__dirname, '..', subPath);
}

// Helper to extract session data for Discord notifications
function extractSessionData(sessionFolder, sessionFolderName) {
  try {
    const sessionDataPath = path.join(sessionFolder, 'parsed_session.json');
    const sessionTitlesPath = path.join(sessionFolder, 'session_titles.json');
    const finalScoresPath = path.join(sessionFolder, 'final_scores.json');
    
    let sessionData = null;
    let sessionTitles = null;
    let finalScores = null;
    
    if (fs.existsSync(sessionDataPath)) {
      sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
    }
    
    if (fs.existsSync(sessionTitlesPath)) {
      sessionTitles = JSON.parse(fs.readFileSync(sessionTitlesPath, 'utf8'));
    }
    
    if (fs.existsSync(finalScoresPath)) {
      finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
    }
    
    // Calculate basic stats
    let totalCharacterTurns = 0;
    let totalBattles = 0;
    let totalActions = 0;
    const uniqueCharacters = new Set();
    
    if (sessionData && sessionData.days) {
      Object.values(sessionData.days).forEach((dayData) => {
        totalCharacterTurns += (dayData.characterTurns || []).length;
        totalBattles += (dayData.battles || []).length;
        (dayData.characterTurns || []).forEach((turn) => {
          if (turn.character && !turn.character.includes('HQ')) {
            uniqueCharacters.add(turn.character);
          }
          totalActions += (turn.actions || []).length;
        });
      });
    }
    
    const characters = sessionData?.characterToPlayer || {};
    const characterCount = Object.keys(characters).length;
    const playerCount = new Set(Object.values(characters)).size;
    
    // Calculate final day
    const totalDays = sessionData?.days ? Object.keys(sessionData.days).length : 0;
    const finalDayNum = totalDays > 0 ? totalDays - 1 : 0;
    const months = Math.floor(finalDayNum / 28) + 1;
    const dayNum = (finalDayNum % 28) + 1;
    const finalDay = `${months}m${dayNum}d`;
    
    // Find highest scoring character
    let highestScore = 0;
    let highestCharacter = null;
    let highestPlayer = null;
    
    if (finalScores) {
      Object.entries(finalScores).forEach(([characterName, scoreData]) => {
        if (scoreData.totalScore > highestScore) {
          highestScore = scoreData.totalScore;
          highestCharacter = characterName;
          highestPlayer = sessionData?.characterToPlayer?.[characterName] || 'Unknown';
        }
      });
    }
    
    // Get list of players
    const players = sessionData?.players ? Object.keys(sessionData.players) : [];
    const playerList = players.join(', ');
    
    return {
      name: sessionTitles?.title || sessionData?.sessionName || sessionFolderName,
      players: playerCount,
      characters: characterCount,
      totalCharacterTurns,
      totalBattles,
      totalActions,
      uniqueCharacters: uniqueCharacters.size,
      days: totalDays,
      finalDay,
      finalScores,
      playerList,
      highestCharacter,
      highestPlayer,
      highestScore
    };
  } catch (error) {
    console.error('Error extracting session data:', error);
    return {
      name: sessionFolderName,
      players: 0,
      characters: 0,
      totalCharacterTurns: 0,
      totalBattles: 0,
      totalActions: 0,
      uniqueCharacters: 0,
      days: 0,
      finalDay: 'Unknown',
      playerList: '',
      highestCharacter: null,
      highestPlayer: null,
      highestScore: 0
    };
  }
}

async function processAllSessions() {
  console.log('🎮 Magic Realm - Process All Sessions');
  console.log('=====================================');
  
  // const webhook = getWebhook(); // DISCORD WEBHOOKS DISABLED - Use admin panel instead
  const results = [];
  
  // Check uploads directory location
  const uploadsDir = resolveAppPath('public/uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found.');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  const hasGameFiles = files.some(file => 
    (file.endsWith('.rslog') || file.endsWith('.rsgame')) && 
    !file.startsWith('._') && 
    !file.startsWith('.DS_Store')
  );
  
  if (!hasGameFiles) {
    console.log('No game files found in uploads directory.');
    return;
  }
  
  const sessionBaseNames = new Set();
  files.forEach(file => {
    if (file.startsWith('._') || file.startsWith('.DS_Store') || file.startsWith('.')) return;
    if (file.endsWith('.rslog') || file.endsWith('.rsgame')) {
      const baseName = file.replace(/\.(rslog|rsgame)$/, '');
      sessionBaseNames.add(baseName);
    }
  });
  
  if (sessionBaseNames.size === 0) {
    console.log('No game files found.');
    return;
  }
  
  // Send batch processing start notification
  // if (sessionBaseNames.size > 1) {
  //   await webhook.sendMessage(`🔄 Starting batch processing of ${sessionBaseNames.size} sessions...`);
  // } // DISCORD WEBHOOKS DISABLED - Use admin panel instead
  
  for (const baseName of sessionBaseNames) {
    let originalCwd = process.cwd();
    const sessionResult = {
      sessionName: baseName,
      success: false,
      error: null
    };
    
    try {
      // Send processing start notification
      // await webhook.sendProcessingStart(baseName); // DISCORD WEBHOOKS DISABLED - Use admin panel instead
      
      // 1. Create unique session folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const sessionFolderName = `${baseName}_${timestamp}_${uniqueId}`;
      const sessionFolder = resolveAppPath(path.join('public/parsed_sessions', sessionFolderName));
      console.log('DEBUG: IS_DOCKER =', process.env.IS_DOCKER, 'sessionFolder =', sessionFolder);
      fs.mkdirSync(sessionFolder, { recursive: true });

      // 2. Copy and rename source files
      const rslogSrc = path.join(uploadsDir, `${baseName}.rslog`);
      const rsgameSrc = path.join(uploadsDir, `${baseName}.rsgame`);
      if (fs.existsSync(rslogSrc)) {
        const sessionRslog = path.join(sessionFolder, `${sessionFolderName}.rslog`);
        fs.copyFileSync(rslogSrc, sessionRslog);
        fs.unlinkSync(rslogSrc);
      }
      if (fs.existsSync(rsgameSrc)) {
        const sessionRsgame = path.join(sessionFolder, `${sessionFolderName}.rsgame`);
        fs.copyFileSync(rsgameSrc, sessionRsgame);
        fs.unlinkSync(rsgameSrc);
      }

      // 3. Change working directory to session folder
      process.chdir(sessionFolder);
      console.log(`\n--- Created and prepared session folder: ${sessionFolderName} ---`);

      // 4. Run all scripts in place (no session name argument)
      const mainSrc = fs.existsSync(`${sessionFolderName}.rslog`) ? `${sessionFolderName}.rslog` : `${sessionFolderName}.rsgame`;
      if (fs.existsSync(mainSrc)) {
        console.log(`Running main session parser with ${mainSrc}...`);
        execSync(`node ${resolveAppPath('scripts/parse_game_session.js')} ${mainSrc}`, { stdio: 'inherit' });
      }
      
      // 5. Run detailed log parser (only if .rslog exists)
      if (fs.existsSync(`${sessionFolderName}.rslog`)) {
        console.log('Running detailed log parser...');
        try {
          execSync(`node ${resolveAppPath('scripts/parse_game_log_detailed.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Log parser failed, continuing with other steps...');
        }
      } else {
        console.log('No .rslog file found, skipping log parser');
      }
      
      // 6. Run map parser (only if .rsgame exists)
      if (fs.existsSync('extracted_game.xml')) {
        console.log('Running map parser...');
        try {
          execSync(`node ${resolveAppPath('scripts/parse_map_data.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Map parser failed, continuing with other steps...');
        }
      } else {
        console.log('No extracted_game.xml found, skipping map parser');
      }
      
      // 7. Run character stats extraction (only if .rsgame exists)
      if (fs.existsSync('extracted_game.xml')) {
        console.log('Running character stats extraction...');
        try {
          execSync(`node ${resolveAppPath('scripts/extract_character_stats.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Character stats extraction failed, continuing with other steps...');
        }
      } else {
        console.log('No extracted_game.xml found, skipping character stats extraction');
      }
      
      // 8. Run character inventories extraction (requires both parsed_session.json and extracted_game.xml)
      if (fs.existsSync('parsed_session.json') && fs.existsSync('extracted_game.xml')) {
        console.log('Running character inventories extraction...');
        try {
          execSync(`node ${resolveAppPath('scripts/extract_character_inventories.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Character inventories extraction failed, continuing with other steps...');
        }
      } else {
        console.log('Missing parsed_session.json or extracted_game.xml, skipping character inventories extraction');
      }
      
      // 9. Run scoring calculation (requires character_stats.json, scoring.json, and character_inventories.json)
      if (fs.existsSync('character_stats.json') && fs.existsSync('scoring.json') && fs.existsSync('character_inventories.json')) {
        console.log('Running scoring calculation...');
        try {
          execSync(`node ${resolveAppPath('scripts/calculate_scoring.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Scoring calculation failed, continuing with other steps...');
        }
      } else {
        console.log('Missing required files for scoring calculation');
      }
      
      // 10. Generate session titles (requires parsed_session.json, map_locations.json, and final_scores.json)
      if (fs.existsSync('parsed_session.json') && fs.existsSync('map_locations.json') && fs.existsSync('final_scores.json')) {
        console.log('Generating session titles...');
        try {
          execSync(`node ${resolveAppPath('scripts/generate_session_titles.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Session title generation failed, continuing with other steps...');
        }
      } else {
        console.log('Missing required files for session title generation');
      }
      
      // 11. Generate map state data (requires parsed_session.json and map_locations.json)
      if (fs.existsSync('parsed_session.json') && fs.existsSync('map_locations.json')) {
        console.log('Generating map state data...');
        try {
          execSync(`node ${resolveAppPath('scripts/track_map_state.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Map state generation failed, continuing with other steps...');
        }
      } else {
        console.log('Missing required files for map state generation');
      }

      // 12. Write metadata file
      const metadata = {
        originalBaseName: baseName,
        processedAt: new Date().toISOString(),
        files: fs.readdirSync('.')
      };
      fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
      
      // Extract session data for Discord notification
      // const sessionData = extractSessionData(sessionFolder, sessionFolderName);
      
      // Send completion notification
      // const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      // await webhook.sendSessionComplete(sessionData, sessionFolderName, baseUrl); // DISCORD WEBHOOKS DISABLED - Use admin panel instead
      
      console.log(`\n✅ ${sessionFolderName} processed successfully!`);
      sessionResult.success = true;
      process.chdir(originalCwd);
      
    } catch (error) {
      console.error(`❌ Error preparing session folder for ${baseName}: ${error.message}`);
      console.error(`   Stack trace: ${error.stack}`);
      
      // Send error notification
      // await webhook.sendProcessingError(baseName, error); // DISCORD WEBHOOKS DISABLED - Use admin panel instead
      
      sessionResult.success = false;
      sessionResult.error = error.message;
      process.chdir(originalCwd);
    }
    
    results.push(sessionResult);
  }

  // 13. Build master statistics after all sessions are processed
  console.log('\n📊 Building master statistics...');
  try {
    execSync(`node ${resolveAppPath('scripts/build_master_stats.js')}`, { stdio: 'inherit' });
    console.log('✅ Master statistics built successfully!');
  } catch (error) {
    console.error(`❌ Error building master statistics: ${error.message}`);
  }
  
  // 14. Generate session titles for all sessions
  console.log('\n📝 Generating session titles for all sessions...');
  try {
    execSync(`node ${resolveAppPath('scripts/generate_session_titles.js')}`, { stdio: 'inherit' });
    console.log('✅ Session titles generated successfully!');
  } catch (error) {
    console.error(`❌ Error generating session titles: ${error.message}`);
  }
  
  // 15. Clean uploads directory
  console.log('\n🧹 Cleaning uploads directory...');
  try {
    const uploadsDir = resolveAppPath('public/uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith('._') || file.startsWith('.DS_Store')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }
    console.log('✅ Uploads directory cleaned!');
  } catch (error) {
    console.error(`❌ Error cleaning uploads directory: ${error.message}`);
  }
  
  // Send batch processing summary
  // if (results.length > 1) {
  //   await webhook.sendBatchSummary(results);
  // } // DISCORD WEBHOOKS DISABLED - Use admin panel instead
  
  console.log('\n🎉 All sessions processed!');
  console.log(`Results: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
}

processAllSessions(); 