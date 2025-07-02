#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing Hundred Acre Realm container...');
console.log('📋 Version: 2025-07-02-v6 (fix scoring, map parsing, and session titles)');

// Define the source and destination paths
const initData = [
  {
    source: '/app/coregamedata',
    dest: '/app/coregamedata',
    description: 'Core game data (characters, items, spells, etc.)'
  },
  {
    source: '/app/public/images',
    dest: '/app/public/images', 
    description: 'Static images and assets'
  },
  {
    source: '/app/data',
    dest: '/app/data',
    description: 'Application data'
  }
];

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source directory ${src} does not exist, skipping...`);
    return false;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  return true;
}

function initializeContainer() {
  let hasChanges = false;
  
  // Ensure required directories exist for volume mounts
  const requiredDirs = [
    '/app/public/uploads'  // Only create uploads, not parsed_sessions
  ];
  
  for (const dir of requiredDirs) {
    console.log(`🔍 Checking directory: ${dir}`);
    console.log(`   Exists: ${fs.existsSync(dir)}`);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
      hasChanges = true;
    } else {
      console.log(`📁 Directory already exists: ${dir}`);
      // Check what's in it
      try {
        const contents = fs.readdirSync(dir);
        console.log(`   Contents: ${contents.length} items`);
        if (contents.length > 0) {
          console.log(`   Items: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`);
        }
      } catch (error) {
        console.log(`   Error reading contents: ${error.message}`);
      }
    }
  }
  
  // Check parsed_sessions but don't create it (let volume mount handle it)
  const parsedSessionsDir = '/app/public/parsed_sessions';
  console.log(`🔍 Checking volume-mounted directory: ${parsedSessionsDir}`);
  console.log(`   Exists: ${fs.existsSync(parsedSessionsDir)}`);
  
  if (fs.existsSync(parsedSessionsDir)) {
    try {
      const contents = fs.readdirSync(parsedSessionsDir);
      console.log(`   Contents: ${contents.length} items`);
      if (contents.length > 0) {
        console.log(`   Items: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`);
      }
    } catch (error) {
      console.log(`   Error reading contents: ${error.message}`);
    }
  } else {
    console.log(`⚠️  Volume mount not working - parsed_sessions directory not found`);
  }
  
  // IMPORTANT: Do NOT create any files in parsed_sessions directory
  // This would prevent the volume mount from working
  
  for (const { source, dest, description } of initData) {
    console.log(`📁 Checking ${description}...`);
    
    if (copyDirectory(source, dest)) {
      console.log(`✅ ${description} initialized`);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    console.log('🎉 Container initialization completed successfully!');
    console.log('📝 Note: Core game data has been copied to mapped volumes.');
    console.log('   Future updates to these files will persist in the mapped directories.');
  } else {
    console.log('ℹ️  Container already initialized, skipping...');
  }
}

// Run initialization
try {
  initializeContainer();
  
  // Process any existing sessions
  console.log('\n🎮 Processing existing game sessions...');
  try {
    const { execSync } = require('child_process');
    const result = execSync('node process_all_sessions.js', { 
      stdio: 'pipe',
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 60000 // 60 second timeout
    });
    console.log('✅ Session processing completed');
    console.log('Script output:', result);
  } catch (error) {
    console.error('❌ Session processing failed:', error.message);
    console.error('   Exit code:', error.status);
    console.error('   stdout:', error.stdout || 'No output');
    console.error('   stderr:', error.stderr || 'No error output');
    console.log('⚠️  Continuing with application startup...');
  }
} catch (error) {
  console.error('❌ Error during container initialization:', error.message);
  // Don't exit with error code, as this might prevent the app from starting
  console.log('⚠️  Continuing with application startup...');
} 