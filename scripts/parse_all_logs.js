const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function parseAllLogs() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const logFiles = fs.readdirSync(uploadsDir)
    .filter(file => file.endsWith('.rslog'))
    .sort();

  console.log(`Found ${logFiles.length} .rslog files to parse:`);
  logFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  const results = [];

  for (const logFile of logFiles) {
    try {
      console.log(`\n=== Parsing ${logFile} ===`);
      
      // Run the parser using the existing script
      execSync(`node scripts/parse_game_log_detailed.js ${logFile}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      results.push({
        file: logFile,
        success: true
      });
      
      console.log(`✅ Successfully parsed ${logFile}`);
      
    } catch (error) {
      console.error(`❌ Failed to parse ${logFile}:`, error.message);
      results.push({
        file: logFile,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n=== PARSING SUMMARY ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully parsed: ${successful.length} files`);
  console.log(`❌ Failed to parse: ${failed.length} files`);
  
  if (successful.length > 0) {
    console.log('\nSuccessful parses:');
    successful.forEach(r => {
      console.log(`  - ${r.file}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\nFailed parses:');
    failed.forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
  }

  return results;
}

// Run the script
parseAllLogs().catch(console.error); 