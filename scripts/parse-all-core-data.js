const { spawn } = require('child_process');
const path = require('path');

// Define the parsers in order
const parsers = [
  { name: 'Monsters', script: 'parse-monsters.js' },
  { name: 'Natives', script: 'parse-natives.js' },
  { name: 'Items', script: 'parse-items.js' },
  { name: 'Spells', script: 'parse-spells.js' },
  { name: 'Tiles', script: 'parse-tiles.js' },
  { name: 'Chits (Warning, Sound, Treasure, Dwelling)', script: 'parse-chits.js' },
  { name: 'Characters', script: 'parse-characters.js' }
];

// Function to run a parser script
function runParser(parser) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running ${parser.name} parser...`);
    console.log(`📁 Script: ${parser.script}`);
    console.log('─'.repeat(60));
    
    const child = spawn('node', [path.join(__dirname, parser.script)], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${parser.name} parser completed successfully`);
        resolve();
      } else {
        console.error(`\n❌ ${parser.name} parser failed with exit code ${code}`);
        reject(new Error(`${parser.name} parser failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Error running ${parser.name} parser:`, error.message);
      reject(error);
    });
  });
}

// Main function to run all parsers in sequence
async function runAllParsers() {
  console.log('🚀 Starting Magic Realm Core Game Data Parsing');
  console.log('='.repeat(60));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`📂 Working directory: ${__dirname}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < parsers.length; i++) {
    const parser = parsers[i];
    console.log(`\n📋 Step ${i + 1}/${parsers.length}: ${parser.name}`);
    
    try {
      await runParser(parser);
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`\n💥 Failed to run ${parser.name} parser:`, error.message);
      
      // Ask if user wants to continue with remaining parsers
      console.log(`\n⚠️  ${parser.name} parser failed. Do you want to continue with the remaining parsers?`);
      console.log('   (This is a non-interactive script, so continuing automatically...)');
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Magic Realm Core Game Data Parsing Complete');
  console.log('='.repeat(60));
  console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
  console.log(`⏱️  Total duration: ${duration} seconds`);
  console.log(`✅ Successful parsers: ${successCount}/${parsers.length}`);
  console.log(`❌ Failed parsers: ${failureCount}/${parsers.length}`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All parsers completed successfully!');
    console.log('📁 Check the /coregamedata directory for all parsed data.');
  } else {
    console.log(`\n⚠️  ${failureCount} parser(s) failed. Check the output above for details.`);
  }
  
  console.log('\n📋 Parsers run in order:');
  parsers.forEach((parser, index) => {
    console.log(`   ${index + 1}. ${parser.name}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Magic Realm Core Game Data Parser');
  console.log('==================================');
  console.log('');
  console.log('Usage: node parse-all-core-data.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --list, -l     List all parsers that will be run');
  console.log('');
  console.log('This script runs all core game data parsers in the following order:');
  parsers.forEach((parser, index) => {
    console.log(`  ${index + 1}. ${parser.name} (${parser.script})`);
  });
  console.log('');
  console.log('All parsed data will be saved to the /coregamedata directory.');
  process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
  console.log('Magic Realm Core Game Data Parsers:');
  console.log('====================================');
  parsers.forEach((parser, index) => {
    console.log(`${index + 1}. ${parser.name} (${parser.script})`);
  });
  process.exit(0);
}

// Run the main function
runAllParsers().catch((error) => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
}); 