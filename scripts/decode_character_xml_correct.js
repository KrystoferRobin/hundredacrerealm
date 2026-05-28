const fs = require('fs');
const path = require('path');

// Tile code mappings from the search results
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

function decodeAction(actionCode) {
  if (!actionCode) return 'Unknown';
  
  console.log(`Decoding action: ${actionCode}`);
  
  // Handle move actions: M-TILECODE-CLEARING or M-TILECODE-CLEARING,M-TILECODE-CLEARING
  if (actionCode.startsWith('M-')) {
    console.log(`Processing move action: ${actionCode}`);
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
          moves.push(`${tileName} clearing ${clearing}`);
          console.log(`Parsed move: ${tileCodeOnly} -> ${tileName} clearing ${clearing}`);
        }
      }
    });
    
    if (moves.length > 0) {
      if (moves.length === 1) {
        const result = `Move to ${moves[0]}`;
        console.log(`Returning: ${result}`);
        return result;
      } else {
        // Multiple moves to the same clearing (like on mountains)
        const result = `Move to ${moves[0]} (mountain - requires 2 moves)`;
        console.log(`Returning: ${result}`);
        return result;
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
  
  // Handle other actions (but exclude 'M' since we handle moves above)
  for (const [code, name] of Object.entries(ACTION_CODES)) {
    if (code !== 'M' && actionCode.startsWith(code)) {
      console.log(`Found action code ${code} -> ${name}`);
      return name;
    }
  }
  
  console.log(`No match found, returning: ${actionCode}`);
  return actionCode;
}

function parseCharacterXML(xmlPath) {
  console.log('Parsing character XML:', xmlPath);
  
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  
  // Extract all AttributeBlocks
  const attributeBlockRegex = /<AttributeBlock blockName="([^"]+)">([\s\S]*?)<\/AttributeBlock>/g;
  const blocks = {};
  let match;
  
  while ((match = attributeBlockRegex.exec(xmlContent)) !== null) {
    const blockName = match[1];
    const blockContent = match[2];
    
    // Parse attributes
    const attributes = {};
    const attrRegex = /<attribute ([^>]+)\/>/g;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(blockContent)) !== null) {
      const attrStr = attrMatch[1];
      const attrPairs = attrStr.split(' ');
      attrPairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          attributes[key] = value.replace(/"/g, '');
        }
      });
    }
    
    // Parse attribute lists
    const attrListRegex = /<attributeList keyName="([^"]+)">([\s\S]*?)<\/attributeList>/g;
    const attributeLists = {};
    let listMatch;
    
    while ((listMatch = attrListRegex.exec(blockContent)) !== null) {
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
      
      attributeLists[listName] = listValues;
    }
    
    blocks[blockName] = { attributes, attributeLists };
  }
  
  // Also parse attributeLists that are outside of AttributeBlocks (like day-specific ones)
  const mainAttrListRegex = /<attributeList keyName="([^"]+)">([\s\S]*?)<\/attributeList>/g;
  let mainListMatch;
  
  while ((mainListMatch = mainAttrListRegex.exec(xmlContent)) !== null) {
    const listName = mainListMatch[1];
    const listContent = mainListMatch[2];
    
    // Only add if it's a day-specific attributeList
    if (listName.match(/^month_\d+_day_\d+$/)) {
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
      if (!blocks[listName]) {
        blocks[listName] = { attributes: {}, attributeLists: {} };
      }
      blocks[listName].attributeLists[listName] = listValues;
    }
  }
  
  // Extract timeline data from day-specific attributeLists
  const timeline = {};
  
  console.log('Available blocks:', Object.keys(blocks).filter(name => name.match(/^month_\d+_day_\d+$/)));
  
  Object.keys(blocks).forEach(blockName => {
    // Only parse main day blocks, skip "v" (visibility) and "c" (combat) sections
    if (blockName.match(/^month_\d+_day_\d+$/) && !blockName.endsWith('v') && !blockName.endsWith('c')) {
      const block = blocks[blockName];
      const actions = [];
      
      console.log(`Processing ${blockName}:`, JSON.stringify(block, null, 2));
      
      // Parse the attributeList values for this day
      if (block.attributeLists && block.attributeLists[blockName]) {
        const dayActions = block.attributeLists[blockName];
        
        // Sort by N0, N1, N2, etc. to get actions in order
        const sortedKeys = Object.keys(dayActions).sort((a, b) => {
          const aNum = parseInt(a.substring(1));
          const bNum = parseInt(b.substring(1));
          return aNum - bNum;
        });
        
        sortedKeys.forEach(key => {
          const actionCode = dayActions[key];
          if (actionCode && actionCode !== '_DAY_') {
            actions.push({
              action: decodeAction(actionCode),
              rawAction: actionCode
            });
          }
        });
      }
      
      if (actions.length > 0) {
        timeline[blockName] = actions;
      }
    }
  });
  
  // Extract daily monster rolls and character state
  const dailyData = {};
  
  Object.keys(blocks).forEach(blockName => {
    // Only parse main day blocks, skip "v" (visibility) and "c" (combat) sections
    // These sections contain game mechanics data that's not needed for narrative parsing
    if (blockName.match(/^month_\d+_day_\d+$/) && !blockName.endsWith('v') && !blockName.endsWith('c')) {
      const block = blocks[blockName];
      dailyData[blockName] = {
        monsterRoll: block.attributes?.m_rlll || null,
        battlePhases: {
          battle: block.attributes?.b_phs || null,
          spell: block.attributes?.s_phs || null,
          shoot: block.attributes?.sh_phs || null
        }
      };
    }
  });
  
  // Extract character stats
  const characterStats = {
    fame: blocks['VR__']?.attributes?.f || null,
    notoriety: blocks['VR__']?.attributes?.n || null,
    gold: blocks['VR__']?.attributes?.g || null,
    gameTime: blocks['VR__']?.attributes?.gt || null,
    unusedSpells: blocks['VR__']?.attributes?.us || null,
    quicknessPoints: blocks['VR__']?.attributes?.qp || null
  };
  
  // Extract game relationships
  const gameRelations = blocks['gamerel']?.attributes || {};
  
  // Extract optional advantages
  const advantages = blocks['optional']?.attributeLists?.advantages || {};
  
  // Extract notebook entries
  const notebook = blocks['_ntbk_']?.attributes || {};
  
  // Extract kills
  const kills = blocks['kills_b']?.attributeLists || {};
  
  return {
    timeline,
    dailyData,
    characterStats,
    gameRelations,
    advantages,
    notebook,
    kills,
    rawBlocks: blocks
  };
}

function formatTimeline(timeline) {
  const formatted = {};
  
  Object.keys(timeline).sort().forEach(date => {
    const actions = timeline[date];
    formatted[date] = actions.map(action => ({
      action: action.action,
      rawAction: action.rawAction
    }));
  });
  
  return formatted;
}

function formatDailyData(dailyData) {
  const formatted = {};
  
  Object.keys(dailyData).sort().forEach(date => {
    const data = dailyData[date];
    formatted[date] = {
      monsterRoll: data.monsterRoll,
      battlePhases: data.battlePhases
    };
  });
  
  return formatted;
}

function main() {
  const xmlPath = 'parsed_sessions/learning-woodsgirl/extracted_game.xml';
  
  if (!fs.existsSync(xmlPath)) {
    console.error('XML file not found:', xmlPath);
    return;
  }
  
  const result = parseCharacterXML(xmlPath);
  
  // Save comprehensive results
  const outputPath = 'parsed_sessions/learning-woodsgirl/decoded_character_data_correct.json';
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  // Save formatted timeline
  const timelinePath = 'parsed_sessions/learning-woodsgirl/character_timeline_correct.json';
  const formattedTimeline = formatTimeline(result.timeline);
  fs.writeFileSync(timelinePath, JSON.stringify(formattedTimeline, null, 2));
  
  // Save daily data
  const dailyPath = 'parsed_sessions/learning-woodsgirl/character_daily_data_correct.json';
  const formattedDaily = formatDailyData(result.dailyData);
  fs.writeFileSync(dailyPath, JSON.stringify(formattedDaily, null, 2));
  
  // Print summary
  console.log('\n=== CHARACTER DATA SUMMARY ===');
  console.log(`Timeline entries: ${Object.keys(result.timeline).length}`);
  console.log(`Daily data entries: ${Object.keys(result.dailyData).length}`);
  console.log(`Character stats:`, result.characterStats);
  console.log(`Game relations:`, result.gameRelations);
  
  console.log('\n=== SAMPLE TIMELINE ===');
  const sampleDates = Object.keys(formattedTimeline).slice(0, 10);
  sampleDates.forEach(date => {
    console.log(`\n${date}:`);
    formattedTimeline[date].forEach(action => {
      console.log(`  - ${action.action} (${action.rawAction})`);
    });
  });
  
  console.log('\n=== SAMPLE DAILY DATA ===');
  const sampleDailyDates = Object.keys(formattedDaily).slice(0, 5);
  sampleDailyDates.forEach(date => {
    console.log(`\n${date}:`);
    console.log(`  Monster roll: ${formattedDaily[date].monsterRoll}`);
    console.log(`  Battle phases: ${JSON.stringify(formattedDaily[date].battlePhases)}`);
  });
  
  console.log('\nFiles saved:');
  console.log(`- ${outputPath}`);
  console.log(`- ${timelinePath}`);
  console.log(`- ${dailyPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseCharacterXML, decodeAction, TILE_CODES, ACTION_CODES }; 