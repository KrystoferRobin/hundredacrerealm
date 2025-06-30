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
  
  // Handle move actions: M-TILECODE-CLEARING
  if (actionCode.startsWith('M-')) {
    const parts = actionCode.split('-');
    if (parts.length >= 3) {
      const tileCode = parts[1];
      const clearing = parts[2];
      const tileName = TILE_CODES[tileCode] || tileCode;
      return `Move to ${tileName} clearing ${clearing}`;
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
  
  // Handle other actions
  for (const [code, name] of Object.entries(ACTION_CODES)) {
    if (actionCode.startsWith(code)) {
      return name;
    }
  }
  
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
  
  // Extract timeline data
  const timeline = {};
  
  // Get action history
  if (blocks['_m_hist__'] && blocks['_m_histd__']) {
    const actions = blocks['_m_hist__'].attributeLists;
    const dates = blocks['_m_histd__'].attributeLists;
    
    if (actions && dates) {
      Object.keys(actions).forEach(index => {
        const action = actions[index];
        const date = dates[index];
        
        if (action && date) {
          const actionCode = Object.values(action)[0];
          const dateStr = Object.values(date)[0];
          
          // Skip _DAY_ entries as they're just day markers
          if (actionCode === '_DAY_') return;
          
          if (!timeline[dateStr]) {
            timeline[dateStr] = [];
          }
          
          timeline[dateStr].push({
            action: decodeAction(actionCode),
            rawAction: actionCode
          });
        }
      });
    }
  }
  
  // Extract daily monster rolls and character state
  const dailyData = {};
  
  Object.keys(blocks).forEach(blockName => {
    if (blockName.match(/^month_\d+_day_\d+$/)) {
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
  const outputPath = 'parsed_sessions/learning-woodsgirl/decoded_character_data_fixed.json';
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  // Save formatted timeline
  const timelinePath = 'parsed_sessions/learning-woodsgirl/character_timeline_fixed.json';
  const formattedTimeline = formatTimeline(result.timeline);
  fs.writeFileSync(timelinePath, JSON.stringify(formattedTimeline, null, 2));
  
  // Save daily data
  const dailyPath = 'parsed_sessions/learning-woodsgirl/character_daily_data_fixed.json';
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