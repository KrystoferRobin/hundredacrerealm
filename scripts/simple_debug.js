#!/usr/bin/env node

console.log('🔍 Simple Debug - Testing module loading directly');
console.log('================================================\n');

// Test each module directly
const modules = [
  { name: 'xml2js', path: 'xml2js' },
  { name: 'fast-xml-parser', path: 'fast-xml-parser' },
  { name: 'adm-zip', path: 'adm-zip' },
  { name: 'xmldom', path: 'xmldom' },
  { name: 'parse_rsgame_map.js', path: './parse_rsgame_map.js' },
  { name: 'extract_map_locations.js', path: './extract_map_locations.js' },
  { name: 'extract_character_stats.js', path: './extract_character_stats.js' }
];

console.log('Testing external dependencies:');
for (const module of modules.slice(0, 4)) {
  try {
    require(module.path);
    console.log(`✅ ${module.name} - OK`);
  } catch (error) {
    console.error(`❌ ${module.name} - FAILED: ${error.message}`);
  }
}

console.log('\nTesting local script modules:');
for (const module of modules.slice(4)) {
  try {
    require(module.path);
    console.log(`✅ ${module.name} - OK`);
  } catch (error) {
    console.error(`❌ ${module.name} - FAILED: ${error.message}`);
  }
}

console.log('\n🔍 Testing file existence:');
const fs = require('fs');
const path = require('path');

const files = [
  'parse_rsgame_map.js',
  'extract_map_locations.js', 
  'extract_character_stats.js',
  'parse_game_session.js'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - EXISTS`);
  } else {
    console.error(`❌ ${file} - MISSING`);
  }
}

console.log('\n🔍 Testing uploads directory:');
const uploadDirs = [
  path.join(__dirname, '../public/uploads'),
  path.join(__dirname, '../uploads'),
  '/app/uploads',
  '/app/public/uploads'
];

for (const dir of uploadDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir} - EXISTS`);
    try {
      const files = fs.readdirSync(dir);
      console.log(`   Contains ${files.length} files: ${files.join(', ')}`);
    } catch (error) {
      console.error(`   Error reading directory: ${error.message}`);
    }
  } else {
    console.log(`❌ ${dir} - MISSING`);
  }
} 