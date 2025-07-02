const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function processAllSessions() {
  console.log('🎮 Magic Realm - Process All Sessions');
  console.log('=====================================\n');
  
  console.log('📁 Starting session processing...\n');
  
  // Check multiple possible uploads directory locations
  const possibleUploadsDirs = [
    '/app/public/uploads',                       // Docker container absolute path (priority)
    path.join(__dirname, '../public/uploads'),  // Local development
    path.join(__dirname, '../uploads'),         // Fallback
  ];
  
  let uploadsDir = null;
  for (const dir of possibleUploadsDirs) {
    if (fs.existsSync(dir)) {
      // Check if the directory actually has game files
      const files = fs.readdirSync(dir);
      const hasGameFiles = files.some(file => 
        (file.endsWith('.rslog') || file.endsWith('.rsgame')) && 
        !file.startsWith('._') && 
        !file.startsWith('.DS_Store')
      );
      
      if (hasGameFiles) {
        uploadsDir = dir;
        console.log(`Found uploads directory with game files: ${uploadsDir}`);
        break;
      } else {
        console.log(`Found uploads directory but no game files: ${dir}`);
      }
    }
  }
  
  if (!uploadsDir) {
    console.log('No uploads directory found. Checked:');
    possibleUploadsDirs.forEach(dir => console.log(`  - ${dir}`));
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files in uploads directory:`, files);
  
  const sessionNames = new Set();
  
  files.forEach(file => {
    // Skip macOS metadata files and other hidden files
    if (file.startsWith('._') || file.startsWith('.DS_Store') || file.startsWith('.')) {
      console.log(`Skipping hidden/metadata file: ${file}`);
      return;
    }
    
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
      console.log(`   Command: node parse_game_session.js ${sessionName}`);
      console.log(`   Working directory: ${__dirname}`);
      
      try {
        const result = execSync(`node parse_game_session.js ${sessionName}`, { 
          stdio: 'pipe',
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        console.log('✓ Main session parser completed successfully');
        console.log('Output:', result);
      } catch (error) {
        console.error(`✗ Main session parser failed: ${error.message}`);
        console.error(`Exit code: ${error.status}`);
        console.error(`Command output: ${error.stdout || 'No output'}`);
        console.error(`Error output: ${error.stderr || 'No error output'}`);
        
        // Try to run the simple debug script to get more info
        console.log('\n🔍 Running simple debug script for more details...');
        try {
          const debugResult = execSync(`node simple_debug.js`, { 
            stdio: 'pipe',
            cwd: __dirname,
            encoding: 'utf8',
            timeout: 15000 // 15 second timeout
          });
          console.log('Debug output:', debugResult);
        } catch (debugError) {
          console.error('Simple debug script also failed:', debugError.message);
          console.error('Debug error stdout:', debugError.stdout || 'No output');
          console.error('Debug error stderr:', debugError.stderr || 'No error output');
        }
        
        throw error;
      }
      
      // Step 2: Run the detailed log parser to generate parsed_session.json
      console.log('2. Running detailed log parser...');
      try {
        const result = execSync(`node parse_game_log_detailed.js ${sessionName}`, { 
          stdio: 'pipe',
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        console.log('✓ Detailed log parser completed successfully');
        console.log('Output:', result);
      } catch (error) {
        console.error(`✗ Detailed log parser failed: ${error.message}`);
        console.error(`Exit code: ${error.status}`);
        console.error(`Command output: ${error.stdout || 'No output'}`);
        console.error(`Error output: ${error.stderr || 'No error output'}`);
        throw error;
      }
      
      // Step 3: Run the map parser to extract map data
      console.log('3. Running map parser...');
      try {
        const result = execSync(`node parse_map_data.js ${sessionName}`, { 
          stdio: 'pipe',
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        console.log('✓ Map parser completed successfully');
        console.log('Output:', result);
      } catch (error) {
        console.error(`✗ Map parser failed: ${error.message}`);
        console.error(`Exit code: ${error.status}`);
        console.error(`Command output: ${error.stdout || 'No output'}`);
        console.error(`Error output: ${error.stderr || 'No error output'}`);
        throw error;
      }
      
      // Step 4: Extract character inventories
      console.log('4. Extracting character inventories...');
      try {
        const result = execSync(`node extract_character_inventories.js ${sessionName}`, { 
          stdio: 'pipe',
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        console.log('✓ Character inventories extracted successfully');
        console.log('Output:', result);
      } catch (error) {
        console.error(`✗ Character inventories extraction failed: ${error.message}`);
        console.error(`Exit code: ${error.status}`);
        console.error(`Command output: ${error.stdout || 'No output'}`);
        console.error(`Error output: ${error.stderr || 'No error output'}`);
        throw error;
      }
      
      // Step 5: Calculate final scores
      console.log('5. Calculating final scores...');
      try {
        const result = execSync(`node calculate_scoring.js ${sessionName}`, { 
          stdio: 'pipe',
          cwd: __dirname,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });
        console.log('✓ Final scores calculated successfully');
        console.log('Output:', result);
      } catch (error) {
        console.error(`✗ Final scores calculation failed: ${error.message}`);
        console.error(`Exit code: ${error.status}`);
        console.error(`Command output: ${error.stdout || 'No output'}`);
        console.error(`Error output: ${error.stderr || 'No error output'}`);
        throw error;
      }
      
      console.log(`✅ ${sessionName} processed successfully!`);
      
      // Step 6: Rename the folder with timestamp and unique ID
      console.log('6. Renaming folder with unique identifier...');
      try {
        const oldPath = path.join(__dirname, '../public/parsed_sessions', sessionName);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS
        const uniqueId = Math.random().toString(36).substring(2, 10); // 8 character random string
        const newFolderName = `${sessionName}_${timestamp}_${uniqueId}`;
        const newPath = path.join(__dirname, '../public/parsed_sessions', newFolderName);
        
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          console.log(`✓ Folder renamed from ${sessionName} to ${newFolderName}`);
          
          // Create metadata file with original info
          const metadata = {
            originalName: sessionName,
            processedAt: new Date().toISOString(),
            timestamp: timestamp,
            uniqueId: uniqueId,
            files: fs.readdirSync(newPath)
          };
          
          const metadataPath = path.join(newPath, 'metadata.json');
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
          console.log(`✓ Metadata file created: ${metadataPath}`);
          
          // Step 7: Clean up uploaded files
          console.log('7. Cleaning up uploaded files...');
          try {
            const rslogPath = path.join(uploadsDir, `${sessionName}.rslog`);
            const rsgamePath = path.join(uploadsDir, `${sessionName}.rsgame`);
            
            if (fs.existsSync(rslogPath)) {
              fs.unlinkSync(rslogPath);
              console.log(`✓ Removed: ${sessionName}.rslog`);
            }
            
            if (fs.existsSync(rsgamePath)) {
              fs.unlinkSync(rsgamePath);
              console.log(`✓ Removed: ${sessionName}.rsgame`);
            }
            
            // Also remove any macOS metadata files
            const metadataFiles = [
              path.join(uploadsDir, `._${sessionName}.rslog`),
              path.join(uploadsDir, `._${sessionName}.rsgame`),
              path.join(uploadsDir, '.DS_Store')
            ];
            
            metadataFiles.forEach(metadataPath => {
              if (fs.existsSync(metadataPath)) {
                fs.unlinkSync(metadataPath);
                console.log(`✓ Removed metadata file: ${path.basename(metadataPath)}`);
              }
            });
            
            console.log(`✓ Upload cleanup completed for ${sessionName}`);
          } catch (error) {
            console.error(`✗ Upload cleanup failed: ${error.message}`);
            // Don't throw error - this is not critical
          }
        } else {
          console.log(`⚠️  Folder not found for renaming: ${oldPath}`);
        }
      } catch (error) {
        console.error(`✗ Folder renaming failed: ${error.message}`);
        // Don't throw error - this is not critical
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${sessionName}:`, error.message);
      console.error(`Full error details:`, error);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Processed ${sessionNames.size} session(s):`);
  
  // List all processed sessions (they will have been renamed)
  const parsedSessionsDir = path.join(__dirname, '../public/parsed_sessions');
  if (fs.existsSync(parsedSessionsDir)) {
    const allFolders = fs.readdirSync(parsedSessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => name.includes('_2024')); // Only show newly processed sessions
    
    if (allFolders.length > 0) {
      console.log('Successfully processed sessions:');
      allFolders.forEach(folder => {
        const sessionDir = path.join(parsedSessionsDir, folder);
        const files = fs.readdirSync(sessionDir);
        console.log(`  - ${folder}: ${files.length} files`);
      });
    } else {
      console.log('No processed sessions found in parsed_sessions directory');
    }
  } else {
    console.log('parsed_sessions directory not found');
  }
  
  console.log('\n✅ All sessions processed!');
  console.log('\nNext steps:');
  console.log('1. Check the public/parsed_sessions directory for generated files');
  console.log('2. Sessions have been renamed with timestamps and unique IDs');
  console.log('3. Uploaded files have been cleaned up');
  console.log('4. Sessions should now appear in the Recent Game Sessions panel');
  console.log('5. You can view individual sessions on the site');
}

// Run if called directly
if (require.main === module) {
  processAllSessions().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processAllSessions }; 