const fs = require('fs');
const path = require('path');

// Tile code mappings
const TILE_CODES = {
  'B': 'Borderland',
  'DW': 'Deep Woods', 
  'R': 'Ruins',
  'L': 'Ledges',
  'AV': 'Awful Valley',
  'MW': 'Maple Woods',
  'PW': 'Pine Woods',
  'LW': 'Linden Woods',
  'CS': 'Caves',
  'OW': 'Old Woods',
  'CN': 'Canyon',
  'EV': 'Evil Valley',
  'CV': 'Cliff Valley',
  'HP': 'High Pass',
  'CL': 'Cliff',
  'CG': 'Crag',
  'DV': 'Dark Valley',
  'AM': 'Ambush',
  'DE': 'Descent',
  'LK': 'Lake',
  'FS': 'Foul Swamp',
  'PS': 'Putrid Swamp',
  'DS': 'Decrepid Swamp',
  'SW': 'Sweet Swamp',
  'LO': 'Lost Woods',
  'OL': 'Old Woods',
  'RR': 'Rapid River',
  'DR': 'Sundry Ruins',
  'HH': 'Holly Hills',
  'FH': 'Fern Hills',
  'IH': 'Ivy Hills',
  'JH': 'Jolly Hills',
  'GH': 'Grassy Hills'
};

// Action abbreviations
const ACTION_CODES = {
  'M': 'Move',
  'A': 'Alert', 
  'H': 'Hide',
  'S': 'Search',
  'T': 'Trade',
  'R': 'Rest',
  'HR': 'Hire',
  'F': 'Follow',
  'EX': 'Enchant',
  'E': 'Enchant',
  'P': 'Peer',
  'RE': 'Remove Enchant',
  'C': 'Cache',
  'BLOCKED': 'Blocked'
};

function decodeDetailedAction(actionCode, visibilityResults = []) {
  if (!actionCode) return 'Unknown';
  
  // Handle move actions: M-TILECODE-CLEARING or M-TILECODE-CLEARING,M-TILECODE-CLEARING
  if (actionCode.startsWith('M-')) {
    // Split by comma to handle multiple moves to the same clearing
    const moveParts = actionCode.split(',');
    const moves = [];
    
    moveParts.forEach(part => {
      // Split by '-' to get the tile code and clearing
      const parts = part.split('-');
      if (parts.length >= 2) {
        const tileCode = parts[1]; // The part after 'M-'
        // Extract clearing number from the end of the tile code
        const clearingMatch = tileCode.match(/(.+?)(\d+)$/);
        if (clearingMatch) {
          const tileCodeOnly = clearingMatch[1];
          const clearing = clearingMatch[2];
          const tileName = TILE_CODES[tileCodeOnly] || tileCodeOnly;
          moves.push(`${tileName} ${clearing}`);
        }
      }
    });
    
    if (moves.length > 0) {
      if (moves.length === 1) {
        return `Moved to ${moves[0]}`;
      } else {
        // Multiple moves to the same clearing (like on mountains)
        return `Moved to ${moves[0]} (mountain - requires 2 moves)`;
      }
    }
  }
  
  // Handle peer actions: P:TILECODE1&TILECODE2
  if (actionCode.startsWith('P:')) {
    const parts = actionCode.split(':')[1];
    if (parts) {
      const tiles = parts.split('&');
      const tileNames = tiles.map(tile => {
        const tileCode = tile.replace(/\d+$/, ''); // Remove clearing number
        return TILE_CODES[tileCode] || tileCode;
      });
      return `Peer between ${tileNames.join(' and ')}`;
    }
  }
  
  // Handle search actions with visibility results
  if (actionCode === 'S') {
    // Count successful searches (T = True/Found, F = False/Not Found)
    const successfulSearches = visibilityResults.filter(result => result === 'T').length;
    const totalSearches = visibilityResults.length;
    
    if (successfulSearches > 0) {
      if (successfulSearches === totalSearches) {
        return `Search/Peer - Found hidden enemies (x${successfulSearches})`;
      } else {
        return `Search/Peer - Found hidden enemies (${successfulSearches}/${totalSearches})`;
      }
    } else {
      return `Search/Peer - No hidden enemies found`;
    }
  }
  
  // Handle other actions
  for (const [code, name] of Object.entries(ACTION_CODES)) {
    if (code !== 'M' && code !== 'S' && actionCode.startsWith(code)) {
      return name;
    }
  }
  
  return actionCode;
}

function parseCharacterXML(xmlPath, characterId) {
  if (!fs.existsSync(xmlPath)) {
    console.log(`XML file not found: ${xmlPath}`);
    return null;
  }

  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  
  // Find the character's GameObject by ID
  const charRegex = new RegExp(`<GameObject id="${characterId}"[\\s\\S]*?</GameObject>`, 'g');
  const charMatch = charRegex.exec(xmlContent);
  
  if (!charMatch) {
    console.log(`Character with ID ${characterId} not found in XML`);
    return null;
  }
  
  const charBlock = charMatch[0];
  
  // Parse all AttributeBlocks for this character
  const blocks = {};
  const blockRegex = /<AttributeBlock blockName="([^"]+)">([\s\S]*?)<\/AttributeBlock>/g;
  let blockMatch;
  
  while ((blockMatch = blockRegex.exec(charBlock)) !== null) {
    const blockName = blockMatch[1];
    const blockContent = blockMatch[2];
    blocks[blockName] = { attributes: {}, attributeLists: {} };
    
    // Parse individual attributes
    const attrRegex = /<attribute ([^>]+)\/>/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(blockContent)) !== null) {
      const attrStr = attrMatch[1];
      const attrPairs = attrStr.split(' ');
      attrPairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          blocks[blockName].attributes[key] = value.replace(/"/g, '');
        }
      });
    }
    
    // Parse attribute lists
    const listRegex = /<attributeList keyName="([^"]+)">([\s\S]*?)<\/attributeList>/g;
    let listMatch;
    while ((listMatch = listRegex.exec(blockContent)) !== null) {
      const listName = listMatch[1];
      const listContent = listMatch[2];
      const listValues = {};
      
      const valRegex = /<attributeVal ([^>]+)\/>/g;
      let valMatch;
      while ((valMatch = valRegex.exec(listContent)) !== null) {
        const valStr = valMatch[1];
        const valPairs = valStr.split(' ');
        valPairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            listValues[key] = value.replace(/"/g, '');
          }
        });
      }
      blocks[blockName].attributeLists[listName] = listValues;
    }
  }
  
  // Extract detailed timeline data from RS_PB__ block's _m_hist__ attributeList
  const timeline = {};
  const rsPbBlock = blocks['RS_PB__'];
  if (rsPbBlock && rsPbBlock.attributeLists) {
    // First, try to parse the _m_hist__ timeline (for month 1)
    if (rsPbBlock.attributeLists['_m_hist__']) {
      const historyData = rsPbBlock.attributeLists['_m_hist__'];
      
      // Get all action codes in order
      const sortedKeys = Object.keys(historyData).sort((a, b) => {
        const aNum = parseInt(a.substring(1));
        const bNum = parseInt(b.substring(1));
        return aNum - bNum;
      });
      
      // Split timeline into days based on _DAY_ markers
      let currentDay = 1;
      let currentMonth = 1;
      let dayActions = [];
      
      sortedKeys.forEach((key, index) => {
        const actionCode = historyData[key];
        
        if (actionCode === '_DAY_') {
          // End of day - save current day's actions
          if (dayActions.length > 0) {
            const dayKey = `${currentMonth}_${currentDay}`;
            timeline[dayKey] = dayActions;
            console.log(`Parsed day ${dayKey} with ${dayActions.length} actions`);
          }
          
          // Start new day
          currentDay++;
          dayActions = [];
        } else if (actionCode && actionCode !== '_DAY_') {
          // Regular action - add to current day
          const decodedAction = decodeDetailedAction(actionCode);
          dayActions.push({
            action: decodedAction,
            rawAction: actionCode,
            visibilityResult: null // We don't have visibility data in this format
          });
        }
      });
      
      // Don't forget the last day if it has actions
      if (dayActions.length > 0) {
        const dayKey = `${currentMonth}_${currentDay}`;
        timeline[dayKey] = dayActions;
        console.log(`Parsed final day ${dayKey} with ${dayActions.length} actions`);
      }
    }
    
    // Now look for separate day-specific attribute lists (for month 2 and beyond)
    const dayKeys = Object.keys(rsPbBlock.attributeLists).filter(key => key.match(/^month_\d+_day_\d+$/));
    dayKeys.forEach(dayKey => {
      const dayActions = rsPbBlock.attributeLists[dayKey];
      // Get visibility results for this day
      const visibilityKey = `${dayKey}v`;
      const visibilityResults = rsPbBlock.attributeLists[visibilityKey] ? 
        Object.values(rsPbBlock.attributeLists[visibilityKey]) : [];
      
      // Sort by N0, N1, N2, etc. to get actions in order
      const sortedKeys = Object.keys(dayActions).sort((a, b) => {
        const aNum = parseInt(a.substring(1));
        const bNum = parseInt(b.substring(1));
        return aNum - bNum;
      });
      
      const actions = [];
      sortedKeys.forEach((key, index) => {
        const actionCode = dayActions[key];
        if (actionCode && actionCode !== '_DAY_') {
          // Get corresponding visibility result if available
          const visibilityResult = visibilityResults[index] || null;
          const decodedAction = decodeDetailedAction(actionCode, visibilityResult ? [visibilityResult] : []);
          actions.push({
            action: decodedAction,
            rawAction: actionCode,
            visibilityResult: visibilityResult
          });
        }
      });
      
      if (actions.length > 0) {
        const timelineKey = dayKey.replace('month_', '').replace('_day_', '_');
        timeline[timelineKey] = actions;
        console.log(`Parsed separate day ${timelineKey} with ${actions.length} actions`);
      }
    });
  }
  
  return timeline;
}

function enhanceSessionData(sessionData, xmlPath) {
  // Get character IDs from the session data
  const characterIds = {};
  
  // Extract character names from the session data
  Object.values(sessionData.days).forEach(dayData => {
    dayData.characterTurns.forEach(turn => {
      if (!characterIds[turn.character]) {
        // We'll need to map character names to IDs
        // For now, we'll use a simple mapping based on the XML structure
        characterIds[turn.character] = null;
      }
    });
  });
  
  // Parse XML to get character IDs and detailed actions
  if (fs.existsSync(xmlPath)) {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    
    // Extract character information from XML
    const characterRegex = /<GameObject id="(\d+)" name="([^"]+)"/g;
    let charMatch;
    
    while ((charMatch = characterRegex.exec(xmlContent)) !== null) {
      const charId = charMatch[1];
      const charName = charMatch[2];
      
      // Map character names to IDs - only for actual characters (not chits or other objects)
      if (characterIds.hasOwnProperty(charName)) {
        characterIds[charName] = charId;
        console.log(`Mapped character "${charName}" to ID ${charId}`);
      }
    }
    
    // Now enhance each day's character turns with detailed actions
    Object.keys(sessionData.days).forEach(dayKey => {
      const dayData = sessionData.days[dayKey];
      
      dayData.characterTurns.forEach(turn => {
        const charId = characterIds[turn.character];
        
        if (charId) {
          console.log(`Processing enhanced actions for ${turn.character} (ID: ${charId}) on day ${dayKey}`);
          // Parse detailed actions for this character
          const detailedTimeline = parseCharacterXML(xmlPath, charId);
          
          if (detailedTimeline && detailedTimeline[dayKey]) {
            // Replace generic actions with detailed ones
            const detailedActions = detailedTimeline[dayKey];
            console.log(`Found ${detailedActions.length} detailed actions for ${turn.character} on ${dayKey}:`, detailedActions);
            
            // Create enhanced actions array
            const enhancedActions = detailedActions.map(detailedAction => ({
              action: detailedAction.action,
              result: detailedAction.visibilityResult === 'T' ? 'Success' : 
                     detailedAction.visibilityResult === 'F' ? 'No result' : 'Completed',
              rawAction: detailedAction.rawAction
            }));
            
            // Update the turn with enhanced actions
            turn.enhancedActions = enhancedActions;
            console.log(`Enhanced actions for ${turn.character}:`, enhancedActions);
          } else {
            console.log(`No detailed timeline found for ${turn.character} on ${dayKey}`);
            // Check what days are available in the timeline
            if (detailedTimeline) {
              console.log(`Available days in timeline:`, Object.keys(detailedTimeline));
            }
          }
        } else {
          console.log(`No character ID found for ${turn.character}`);
        }
      });
    });
  }
  
  return sessionData;
}

function main() {
  const sessionDir = process.argv[2] || '.';
  const xmlPath = path.join(sessionDir, 'extracted_game.xml');
  const sessionDataPath = path.join(sessionDir, 'parsed_session.json');
  
  if (!fs.existsSync(sessionDataPath)) {
    console.error('Session data file not found:', sessionDataPath);
    process.exit(1);
  }
  
  console.log('Loading session data...');
  const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
  
  console.log('Enhancing session data with detailed character actions...');
  const enhancedSessionData = enhanceSessionData(sessionData, xmlPath);
  
  // Save enhanced session data
  const outputPath = path.join(sessionDir, 'enhanced_session.json');
  fs.writeFileSync(outputPath, JSON.stringify(enhancedSessionData, null, 2));
  
  console.log(`Enhanced session data saved to: ${outputPath}`);
  
  // Print sample of enhanced data
  console.log('\n=== SAMPLE ENHANCED DATA ===');
  const sampleDay = Object.keys(enhancedSessionData.days)[0];
  if (sampleDay) {
    const dayData = enhancedSessionData.days[sampleDay];
    console.log(`\nDay ${sampleDay}:`);
    dayData.characterTurns.forEach(turn => {
      console.log(`\n${turn.character} (${turn.player}):`);
      console.log(`  Start: ${turn.startLocation} | End: ${turn.endLocation}`);
      console.log('  Actions:');
      if (turn.enhancedActions) {
        turn.enhancedActions.forEach(action => {
          console.log(`    ${action.action} - ${action.result}`);
        });
      } else {
        turn.actions.forEach(action => {
          console.log(`    ${action.action} - ${action.result}`);
        });
      }
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  enhanceSessionData, 
  parseCharacterXML, 
  decodeDetailedAction, 
  TILE_CODES, 
  ACTION_CODES 
}; 