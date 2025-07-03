const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function processAllSessions() {
  console.log('🎮 Magic Realm - Process All Sessions (Session-First Refactor)');
  console.log('=====================================');
  
  // Check multiple possible uploads directory locations
  const possibleUploadsDirs = [
    '/app/public/uploads',  // Standard container path
    path.join(__dirname, '../public/uploads'),  // Local development
  ];
  
  let uploadsDir = null;
  for (const dir of possibleUploadsDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const hasGameFiles = files.some(file => 
        (file.endsWith('.rslog') || file.endsWith('.rsgame')) && 
        !file.startsWith('._') && 
        !file.startsWith('.DS_Store')
      );
      if (hasGameFiles) {
        uploadsDir = dir;
        break;
      }
    }
  }
  if (!uploadsDir) {
    console.log('No uploads directory found.');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
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
    let originalCwd = process.cwd(); // Define at the start of the loop
    try {
      // 1. Create unique session folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const sessionFolderName = `${baseName}_${timestamp}_${uniqueId}`;
      const sessionFolder = path.join('/app/public/parsed_sessions', sessionFolderName);
      fs.mkdirSync(sessionFolder, { recursive: true });

      // 2. Copy and rename source files (use copy instead of rename to avoid cross-device issues)
      const rslogSrc = path.join(uploadsDir, `${baseName}.rslog`);
      const rsgameSrc = path.join(uploadsDir, `${baseName}.rsgame`);
      if (fs.existsSync(rslogSrc)) {
        const sessionRslog = path.join(sessionFolder, `${sessionFolderName}.rslog`);
        fs.copyFileSync(rslogSrc, sessionRslog);
        // Delete the original after copying
        fs.unlinkSync(rslogSrc);
      }
      if (fs.existsSync(rsgameSrc)) {
        const sessionRsgame = path.join(sessionFolder, `${sessionFolderName}.rsgame`);
        fs.copyFileSync(rsgameSrc, sessionRsgame);
        // Delete the original after copying
        fs.unlinkSync(rsgameSrc);
      }

      // 3. Change working directory to session folder
      process.chdir(sessionFolder);
      console.log(`\n--- Created and prepared session folder: ${sessionFolderName} ---`);

      // 4. Run all scripts in place (no session name argument)
      // Main session parser
      const mainSrc = fs.existsSync(`${sessionFolderName}.rslog`) ? `${sessionFolderName}.rslog` : `${sessionFolderName}.rsgame`;
      if (fs.existsSync(mainSrc)) {
        console.log(`Running main session parser with ${mainSrc}...`);
        execSync(`node /app/scripts/parse_game_session.js ${mainSrc}`, { stdio: 'inherit' });
      }
      // Detailed log parser
      console.log('Running detailed log parser...');
      execSync('node /app/scripts/parse_game_log_detailed.js', { stdio: 'inherit' });
      // Map parser
      console.log('Running map parser...');
      execSync('node /app/scripts/parse_map_data.js', { stdio: 'inherit' });
      // Character stats
      console.log('Running character stats extraction...');
      execSync('node /app/scripts/extract_character_stats.js', { stdio: 'inherit' });
      // Character inventories
      console.log('Running character inventories extraction...');
      execSync('node /app/scripts/extract_character_inventories.js', { stdio: 'inherit' });
      // Final scores
      console.log('Running scoring calculation...');
      execSync('node /app/scripts/calculate_scoring.js', { stdio: 'inherit' });
      // Generate session titles
      console.log('Generating session titles...');
      execSync('node /app/scripts/generate_session_titles.js', { stdio: 'inherit' });
      // Generate map state data
      console.log('Generating map state data...');
      execSync('node /app/scripts/track_map_state.js', { stdio: 'inherit' });

      // 5. Write metadata file
          const metadata = {
        originalBaseName: baseName,
            processedAt: new Date().toISOString(),
        files: fs.readdirSync('.')
      };
      fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
      console.log(`\n✅ ${sessionFolderName} processed successfully!`);
      
      // 6. Restore original working directory
      process.chdir(originalCwd);
    } catch (error) {
      console.error(`❌ Error preparing session folder for ${baseName}: ${error.message}`);
      console.error(`   Stack trace: ${error.stack}`);
      // Restore original working directory on error
      process.chdir(originalCwd);
      continue;
    }
  }
}

processAllSessions();