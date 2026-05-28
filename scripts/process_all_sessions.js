const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolveAppPath(subPath) {
  return path.join(__dirname, '..', subPath);
}

async function processAllSessions() {
  console.log('🎮 Magic Realm - Process All Sessions (Session-First Refactor)');
  console.log('=====================================');
  
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
  
  for (const baseName of sessionBaseNames) {
    let originalCwd = process.cwd();
    try {
      // 1. Create unique session folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const sessionFolderName = `${baseName}_${timestamp}_${uniqueId}`;
      const sessionFolder = resolveAppPath(path.join('public/parsed_sessions', sessionFolderName));
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
      
      // 6. RealmSpeak-aligned save extraction (map_data, map_locations, game_state)
      if (fs.existsSync('extracted_game.xml')) {
        console.log('Running RealmSpeak save extractor...');
        try {
          execSync(`node ${resolveAppPath('scripts/extract_realmspeak_save.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  RealmSpeak save extraction failed, continuing with other steps...');
        }
      } else {
        console.log('No extracted_game.xml found, skipping RealmSpeak save extraction');
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
      
      // 11. Run enhanced character parser (requires parsed_session.json and extracted_game.xml)
      if (fs.existsSync('parsed_session.json') && fs.existsSync('extracted_game.xml')) {
        console.log('Running enhanced character parser...');
        try {
          execSync(`node ${resolveAppPath('scripts/enhanced_character_parser.js')}`, { stdio: 'inherit' });
        } catch (error) {
          console.log('⚠️  Enhanced character parser failed, continuing with other steps...');
        }
      } else {
        console.log('Missing parsed_session.json or extracted_game.xml, skipping enhanced character parser');
      }
      
      // 12. Generate map state data (requires parsed_session.json and map_locations.json)
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
      console.log(`\n✅ ${sessionFolderName} processed successfully!`);
      process.chdir(originalCwd);
    } catch (error) {
      console.error(`❌ Error preparing session folder for ${baseName}: ${error.message}`);
      console.error(`   Stack trace: ${error.stack}`);
      process.chdir(originalCwd);
      continue;
    }
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
}

processAllSessions();