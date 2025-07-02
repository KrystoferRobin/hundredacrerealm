#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Debugging parser script...');
console.log('=====================================\n');

try {
  // Test the parser directly with detailed output
  const result = execSync('node parse_game_session.js 3man-done-dwarf-win', { 
    stdio: 'pipe',
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 30000 // 30 second timeout
  });
  console.log('✅ Parser completed successfully');
  console.log('Output:', result);
} catch (error) {
  console.error('❌ Parser failed:');
  console.error('   Exit code:', error.status);
  console.error('   Error message:', error.message);
  console.error('   stdout:', error.stdout || 'No output');
  console.error('   stderr:', error.stderr || 'No error output');
  
  // Also try to check if the required modules exist
  console.log('\n🔍 Checking required modules...');
  try {
    require('xml2js');
    console.log('✅ xml2js module found');
  } catch (e) {
    console.error('❌ xml2js module missing:', e.message);
  }
  
  try {
    require('./parse_rsgame_map.js');
    console.log('✅ parse_rsgame_map.js module found');
  } catch (e) {
    console.error('❌ parse_rsgame_map.js module missing:', e.message);
  }
  
  try {
    require('./extract_map_locations.js');
    console.log('✅ extract_map_locations.js module found');
  } catch (e) {
    console.error('❌ extract_map_locations.js module missing:', e.message);
  }
  
  try {
    require('./extract_character_stats.js');
    console.log('✅ extract_character_stats.js module found');
  } catch (e) {
    console.error('❌ extract_character_stats.js module missing:', e.message);
  }
} 