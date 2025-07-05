const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
      console.log('Running detailed log parser...');
      execSync(`node ${resolveAppPath('scripts/parse_game_log_detailed.js')}`, { stdio: 'inherit' });
      console.log('Running map parser...');
      execSync(`node ${resolveAppPath('scripts/parse_map_data.js')}`, { stdio: 'inherit' });
      console.log('Running character stats extraction...');
      execSync(`node ${resolveAppPath('scripts/extract_character_stats.js')}`, { stdio: 'inherit' });
      console.log('Running character inventories extraction...');
      execSync(`node ${resolveAppPath('scripts/extract_character_inventories.js')}`, { stdio: 'inherit' });
      console.log('Running scoring calculation...');
      execSync(`node ${resolveAppPath('scripts/calculate_scoring.js')}`, { stdio: 'inherit' });
      console.log('Generating session titles...');
      execSync(`node ${resolveAppPath('scripts/generate_session_titles.js')}`, { stdio: 'inherit' });
      console.log('Generating map state data...');
      execSync(`node ${resolveAppPath('scripts/track_map_state.js')}`, { stdio: 'inherit' });

      // 5. Write metadata file
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

  // 7. Build master statistics after all sessions are processed
  console.log('\n📊 Building master statistics...');
  try {
    execSync(`node ${resolveAppPath('scripts/build_master_stats.js')}`, { stdio: 'inherit' });
    console.log('✅ Master statistics built successfully!');
  } catch (error) {
    console.error(`❌ Error building master statistics: ${error.message}`);
  }
}

processAllSessions();
// All paths are now resolved for both Docker and local dev environments.