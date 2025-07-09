const fs = require('fs');
const path = require('path');

// Import the map building and movement tracking functions
const { parseRsgameMap } = require('./parse_rsgame_map');
const { generateMapStateData } = require('./track_map_state');
const { extractMapLocations } = require('./extract_map_locations');
const { enhanceSessionData } = require('./enhanced_character_parser');

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

async function updateLegacySessions() {
  console.log('🔧 Starting Legacy Session Update...\n');

  try {
    // Check if sessions directory exists
    if (!fs.existsSync(SESSIONS_DIR)) {
      console.log('❌ No sessions directory found. Nothing to update.');
      return;
    }

    const sessionFolders = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);

    if (sessionFolders.length === 0) {
      console.log('❌ No sessions found to update.');
      return;
    }

    console.log(`📁 Found ${sessionFolders.length} sessions to check...\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const sessionId of sessionFolders) {
      const sessionPath = path.join(SESSIONS_DIR, sessionId);
      const parsedSessionPath = path.join(sessionPath, 'parsed_session.json');
      
      if (!fs.existsSync(parsedSessionPath)) {
        console.log(`⚠️  Skipping ${sessionId}: No parsed_session.json found`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`🔍 Checking session: ${sessionId}`);
        
        // Read the session data
        const sessionData = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
        
        let needsUpdate = false;
        const updates = [];

        // Check for missing or outdated map data
        const mapDataPath = path.join(sessionPath, 'map_data.json');
        const mapLocationsPath = path.join(sessionPath, 'map_locations.json');
        if (!fs.existsSync(mapDataPath)) {
          console.log(`  📍 Missing map_data.json - will rebuild`);
          needsUpdate = true;
          updates.push('map_data.json');
        } else {
          // Check if map data is using old format (no dynamic sizing, etc.)
          try {
            const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
            if (!mapData.svgDimensions || !mapData.viewBox) {
              console.log(`  📍 Outdated map_data.json format - will rebuild`);
              needsUpdate = true;
              updates.push('map_data.json (outdated format)');
            }
          } catch (error) {
            console.log(`  📍 Corrupted map_data.json - will rebuild`);
            needsUpdate = true;
            updates.push('map_data.json (corrupted)');
          }
        }

        // Check for missing map_locations.json (needed by map components)
        if (!fs.existsSync(mapLocationsPath)) {
          console.log(`  📍 Missing map_locations.json - will rebuild`);
          needsUpdate = true;
          updates.push('map_locations.json');
        }

        // Check for missing movement data
        const movementDataPath = path.join(sessionPath, 'movement_data.json');
        if (!fs.existsSync(movementDataPath)) {
          console.log(`  🚶 Missing movement_data.json - will rebuild`);
          needsUpdate = true;
          updates.push('movement_data.json');
        }

        // Check for missing enhanced session data
        const enhancedSessionPath = path.join(sessionPath, 'enhanced_session.json');
        if (!fs.existsSync(enhancedSessionPath)) {
          console.log(`  🔍 Missing enhanced_session.json - will rebuild`);
          needsUpdate = true;
          updates.push('enhanced_session.json');
        }

        // Check for missing character inventories (if they exist in session)
        const characterInventoriesPath = path.join(sessionPath, 'character_inventories.json');
        if (!fs.existsSync(characterInventoriesPath) && sessionData.players) {
          console.log(`  🎒 Missing character_inventories.json - will rebuild`);
          needsUpdate = true;
          updates.push('character_inventories.json');
        }

        if (!needsUpdate) {
          console.log(`  ✅ Session ${sessionId} is up to date`);
          skippedCount++;
          continue;
        }

        console.log(`  🔄 Updating session ${sessionId}...`);
        console.log(`     Updates needed: ${updates.join(', ')}`);

        // Rebuild map data if needed
        if (updates.some(u => u.includes('map_data.json'))) {
          try {
            console.log(`     📍 Rebuilding map data...`);
            
            // Check if we have the original .rsgame file
            const rsgameFiles = fs.readdirSync(sessionPath).filter(f => f.endsWith('.rsgame'));
            if (rsgameFiles.length > 0) {
              const rsgamePath = path.join(sessionPath, rsgameFiles[0]);
              const mapData = parseRsgameMap(rsgamePath);
              fs.writeFileSync(mapDataPath, JSON.stringify(mapData, null, 2));
              console.log(`     ✅ Map data rebuilt successfully from .rsgame file`);
            } else {
              console.log(`     ⚠️  No .rsgame file found, skipping map data rebuild`);
            }
          } catch (error) {
            console.log(`     ❌ Failed to rebuild map data: ${error.message}`);
            errorCount++;
            continue;
          }
        }

        // Rebuild map_locations.json if needed
        if (updates.includes('map_locations.json')) {
          try {
            console.log(`     📍 Rebuilding map_locations.json...`);
            
            // Check if we have extracted_game.xml
            const xmlPath = path.join(sessionPath, 'extracted_game.xml');
            if (fs.existsSync(xmlPath)) {
              await extractMapLocations(xmlPath, mapLocationsPath);
              console.log(`     ✅ Map locations rebuilt successfully`);
            } else {
              console.log(`     ⚠️  No extracted_game.xml found, skipping map locations rebuild`);
            }
          } catch (error) {
            console.log(`     ❌ Failed to rebuild map locations: ${error.message}`);
            errorCount++;
            continue;
          }
        }

        // Rebuild enhanced session data if needed
        if (updates.includes('enhanced_session.json')) {
          try {
            console.log(`     🔍 Rebuilding enhanced session data...`);
            
            const xmlPath = path.join(sessionPath, 'extracted_game.xml');
            if (fs.existsSync(xmlPath)) {
              const enhancedSessionData = enhanceSessionData(sessionData, xmlPath);
              fs.writeFileSync(enhancedSessionPath, JSON.stringify(enhancedSessionData, null, 2));
              console.log(`     ✅ Enhanced session data rebuilt successfully`);
            } else {
              console.log(`     ⚠️  No extracted_game.xml found, skipping enhanced session data rebuild`);
            }
          } catch (error) {
            console.log(`     ❌ Failed to rebuild enhanced session data: ${error.message}`);
            errorCount++;
            continue;
          }
        }

        // Rebuild movement data if needed
        if (updates.includes('movement_data.json')) {
          try {
            console.log(`     🚶 Rebuilding movement data...`);
            const movementData = generateMapStateData(sessionPath);
            if (movementData) {
              fs.writeFileSync(movementDataPath, JSON.stringify(movementData, null, 2));
              console.log(`     ✅ Movement data rebuilt successfully`);
            } else {
              console.log(`     ⚠️  Could not generate movement data, skipping`);
            }
          } catch (error) {
            console.log(`     ❌ Failed to rebuild movement data: ${error.message}`);
            errorCount++;
            continue;
          }
        }

        // Rebuild character inventories if needed
        if (updates.includes('character_inventories.json')) {
          try {
            console.log(`     🎒 Rebuilding character inventories...`);
            const characterInventories = await buildCharacterInventories(sessionData);
            fs.writeFileSync(characterInventoriesPath, JSON.stringify(characterInventories, null, 2));
            console.log(`     ✅ Character inventories rebuilt successfully`);
          } catch (error) {
            console.log(`     ❌ Failed to rebuild character inventories: ${error.message}`);
            errorCount++;
            continue;
          }
        }

        updatedCount++;
        console.log(`  ✅ Session ${sessionId} updated successfully\n`);

      } catch (error) {
        console.log(`  ❌ Error processing session ${sessionId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Updated: ${updatedCount} sessions`);
    console.log(`  ⏭️  Skipped: ${skippedCount} sessions (already up to date)`);
    console.log(`  ❌ Errors: ${errorCount} sessions`);
    console.log(`  📁 Total processed: ${sessionFolders.length} sessions`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some sessions had errors. Check the logs above for details.');
    }

    if (updatedCount > 0) {
      console.log('\n🎉 Legacy session update completed successfully!');
    } else {
      console.log('\n✨ All sessions are already up to date!');
    }

  } catch (error) {
    console.error('❌ Fatal error during legacy session update:', error);
    process.exit(1);
  }
}

// Helper function to build character inventories (if not already imported)
async function buildCharacterInventories(sessionData) {
  const inventories = {};
  
  if (sessionData.players) {
    for (const [characterName, playerData] of Object.entries(sessionData.players)) {
      if (playerData.inventory) {
        inventories[characterName] = playerData.inventory;
      }
    }
  }
  
  return inventories;
}

// Run the script if called directly
if (require.main === module) {
  updateLegacySessions();
}

module.exports = { updateLegacySessions }; 