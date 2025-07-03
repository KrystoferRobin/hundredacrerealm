const fs = require('fs');
const path = require('path');

// Configuration - will be set based on input file
let SESSION_DIR = '';
let OUTPUT_FILE = '';
let LOG_FILE = '';

const DEFAULT_LOG_FILE = () => {
  const files = fs.readdirSync('.')
  return files.find(f => f.endsWith('.rslog'));
};

function parseDayFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const dayData = {
    monsterDieRoll: null,
    characterTurns: [],
    battles: [],
    monsterSpawns: [],
    monsterBlocks: []
  };
  
  let currentCharacter = null;
  let currentTurn = null;
  let currentBattle = null;
  let inBattle = false;
  let currentRound = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip host-only lines
    if (line === 'host') continue;
    
    // Extract monster die roll
    const monsterDieMatch = line.match(/Monster Die roll is Rolled (\d+)\./);
    if (monsterDieMatch) {
      dayData.monsterDieRoll = parseInt(monsterDieMatch[1]);
      continue;
    }
    
    // Extract monster spawns
    const monsterSpawnMatch = line.match(/(.+) is added to (.+), clearing (\d+)/);
    if (monsterSpawnMatch) {
      dayData.monsterSpawns.push({
        monster: monsterSpawnMatch[1],
        location: `${monsterSpawnMatch[2]} ${monsterSpawnMatch[3]}`
      });
      continue;
    }
    
    // Extract monster blocks
    const monsterBlockMatch = line.match(/(.+) blocks the (.+)/);
    if (monsterBlockMatch) {
      dayData.monsterBlocks.push({
        monster: monsterBlockMatch[1],
        character: monsterBlockMatch[2]
      });
      continue;
    }
    
    // Check for battle markers
    if (line === '__battle__') {
      if (!inBattle) {
        inBattle = true;
        currentBattle = {
          location: null,
          groups: [],
          rounds: [],
          participants: []
        };
      }
      continue;
    }
    
    // End of battle section
    if (inBattle && (line.includes('Combat has ended') || line.includes('========================================'))) {
      if (currentBattle && currentBattle.location) {
        dayData.battles.push(currentBattle);
      }
      inBattle = false;
      currentBattle = null;
      currentRound = null;
      continue;
    }
    
    // Parse battle information
    if (inBattle && currentBattle) {
      // Battle location
      const battleLocationMatch = line.match(/Battle resolving at (.+):/);
      if (battleLocationMatch) {
        currentBattle.location = battleLocationMatch[1];
        continue;
      }
      
      // Battle location from evening line
      const eveningMatch = line.match(/Evening of month \d+, day \d+, in clearing (.+)/);
      if (eveningMatch) {
        currentBattle.location = eveningMatch[1];
        continue;
      }
      
      // Battle groups (GROUP 1, GROUP 2, etc.)
      const groupMatch = line.match(/GROUP (\d+)/);
      if (groupMatch) {
        const groupNumber = parseInt(groupMatch[1]);
        const group = {
          number: groupNumber,
          participants: []
        };
        
        // Look ahead for participants in this group
        let j = i + 1;
        while (j < lines.length && !lines[j].match(/GROUP \d+/) && !lines[j].includes('=======================') && !lines[j].startsWith('__battle__')) {
          if (lines[j] !== 'host' && lines[j].length > 0 && !lines[j].startsWith('-')) {
            group.participants.push(lines[j]);
            currentBattle.participants.push(lines[j]);
          }
          j++;
        }
        
        currentBattle.groups.push(group);
        continue;
      }
      
      // Combat rounds
      const roundMatch = line.match(/--\s+Combat Round (\d+)/);
      if (roundMatch) {
        currentRound = {
          round: parseInt(roundMatch[1]),
          phase: null,
          actions: [],
          attacks: [],
          damage: [],
          armorDestruction: [],
          deaths: [],
          fameGains: [],
          spellCasting: [],
          fatigue: [],
          disengagement: []
        };
        currentBattle.rounds.push(currentRound);
        continue;
      }
      
      // Phase markers
      if (line.startsWith(' - - - - - ')) {
        const phase = line.replace(' - - - - - ', '');
        if (currentRound) {
          currentRound.phase = phase;
        }
        continue;
      }
      
      // Character/Monster actions - look for name followed by action
      if (i + 1 < lines.length && currentRound) {
        const nextLine = lines[i + 1];
        
        // Check if this line is a character/monster name and next line is an action
        if (line !== 'host' && line.length > 0 && !line.startsWith('=') && !line.startsWith('-') && !line.startsWith('Attack') && !line.includes('vs.')) {
          
          // Character actions (attacks, spells, etc.)
          if (nextLine.includes('Attacks the') || nextLine.includes('Casts') || nextLine.includes('Lures the') || nextLine.includes('Targets') || nextLine.includes('Presses the')) {
            currentRound.actions.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
          
          // Tactics changes
          if (nextLine.includes('Changes tactics')) {
            currentRound.actions.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
          
          // Fatigue
          if (nextLine.includes('Fatiguing') || nextLine.includes('After fatiguing') || nextLine.includes('Wounding')) {
            currentRound.fatigue.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
          
          // Disengagement
          if (nextLine.includes('disengages')) {
            currentRound.disengagement.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
          
          // Fame gains (character name + action pattern)
          if (nextLine.includes('gets') && (nextLine.includes('fame') || nextLine.includes('notoriety'))) {
            currentRound.fameGains.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
          
          // Spell casting details
          if (nextLine.includes('Wish roll') || nextLine.includes('Wish result')) {
            currentRound.spellCasting.push({
              performer: line,
              action: nextLine
            });
            i++; // Skip the next line since we processed it
            continue;
          }
        }
      }
      
      // Attack details (these are system-generated, not character actions)
      if (line.includes('Attack Length=') || line.includes('Attack Speed=')) {
        if (currentRound) {
          currentRound.attacks.push(line);
        }
        continue;
      }
      
      // Combat results (these are system-generated)
      if (line.includes('vs.') && (line.includes('Speed') || line.includes('Missed') || line.includes('Intercepted') || line.includes('Undercut'))) {
        if (currentRound) {
          currentRound.attacks.push(line);
        }
        continue;
      }
      
      // Damage and harm (system-generated)
      if (line.includes('harm') || line.includes('wound') || line.includes('hit with')) {
        if (currentRound) {
          currentRound.damage.push(line);
        }
        continue;
      }
      
      // Armor destruction (system-generated)
      if (line.includes('Hits armor') || line.includes('Destroys') || line.includes('Damages')) {
        if (currentRound) {
          currentRound.armorDestruction.push(line);
        }
        continue;
      }
      
      // Deaths (system-generated)
      if (line.includes('was killed') || line.includes('was killed!')) {
        if (currentRound) {
          currentRound.deaths.push(line);
        }
        continue;
      }
      
      // System messages
      if (line.includes('Assigning random target selection order') || 
          line.includes('Attacks are sorted by') ||
          line.includes('consecutive round of no damage') ||
          line.includes('DISENGAGEMENT')) {
        if (currentRound) {
          currentRound.actions.push({
            performer: 'System',
            action: line
          });
        }
        continue;
      }
    }
    
    // Character turn parsing (outside of battles)
    if (!inBattle) {
      // Check if this line is a character name (not a host line and not empty)
      if (line !== 'host' && line.length > 0 && !line.startsWith('=') && !line.startsWith('Month')) {
        // Check if next line contains "Starts turn:" or "Ends turn:" or an action
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          
          // Start of turn
          const startTurnMatch = nextLine.match(/Starts turn: (.+)/);
          if (startTurnMatch) {
            currentCharacter = line;
            currentTurn = {
              character: line,
              startLocation: startTurnMatch[1],
              actions: [],
              endLocation: null
            };
            continue;
          }
          
          // End of turn
          const endTurnMatch = nextLine.match(/Ends turn: (.+)/);
          if (endTurnMatch && currentTurn && currentTurn.character === line) {
            currentTurn.endLocation = endTurnMatch[1];
            dayData.characterTurns.push(currentTurn);
            currentTurn = null;
            continue;
          }
          
          // Action (format: "Action - result")
          const actionMatch = nextLine.match(/^(.+)\s+-\s+(.+)$/);
          if (actionMatch && currentTurn && currentTurn.character === line) {
            currentTurn.actions.push({
              action: actionMatch[1].trim(),
              result: actionMatch[2].trim()
            });
            continue;
          }
          
          // Reveals (format: "Reveals: item")
          const revealMatch = nextLine.match(/^Reveals:\s+(.+)$/);
          if (revealMatch && currentTurn && currentTurn.character === line) {
            currentTurn.actions.push({
              action: 'Reveals',
              result: revealMatch[1].trim()
            });
            continue;
          }
          
          // Trades with other characters
          const tradeMatch = nextLine.match(/^Trades with (.+)$/);
          if (tradeMatch && currentTurn && currentTurn.character === line) {
            currentTurn.actions.push({
              action: 'Trades',
              result: `with ${tradeMatch[1]}`
            });
            continue;
          }
        }
      }
    }
    
    // Fame gains (standalone lines with character names embedded)
    if (line.includes('gets') && (line.includes('fame') || line.includes('notoriety'))) {
      const fameMatch = line.match(/(.+) gets (\d+) fame.*for the death of (.+)/);
      if (fameMatch && currentRound) {
        currentRound.fameGains.push({
          performer: fameMatch[1].trim(),
          action: line
        });
      }
      continue;
    }
  }
  
  return dayData;
}

function extractPlayerInfo(logContent) {
  const lines = logContent.split('\n');
  const players = {};
  const characterToPlayer = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for "New player joins: PlayerName" followed by character names
    const playerJoinMatch = line.match(/New player joins: (.+)/);
    if (playerJoinMatch) {
      const playerName = playerJoinMatch[1];
      
      // Initialize player if not exists
      if (!players[playerName]) {
        players[playerName] = {
          name: playerName,
          characters: []
        };
      }
      
      // Look ahead for characters that "Join the game"
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('Host has started the game')) {
        const nextLine = lines[j].trim();
        
        // Check if this is a character name followed by "Joins the game"
        if (nextLine !== 'host' && nextLine.length > 0 && !nextLine.startsWith('=') && !nextLine.startsWith('Spent the night')) {
          if (j + 1 < lines.length && lines[j + 1].trim() === 'Joins the game.') {
            const characterName = nextLine;
            
            // Add character to player
            if (!players[playerName].characters.includes(characterName)) {
              players[playerName].characters.push(characterName);
            }
            
            // Map character to player
            characterToPlayer[characterName] = playerName;
          }
        }
        j++;
      }
    }
  }
  
  return { players, characterToPlayer };
}

function parseAllDays(sessionName) {
  const sessionData = {
    sessionName: sessionName,
    players: {},
    characterToPlayer: {},
    days: {}
  };
  
  // Get all day files
  const files = fs.readdirSync(SESSION_DIR)
    .filter(file => file.startsWith('day_') && file.endsWith('.txt'))
    .sort();
  
  console.log(`Found ${files.length} day files to parse`);
  
  // Extract player information from the full log
  const fullLogPath = path.join(SESSION_DIR, 'full_log.txt');
  if (fs.existsSync(fullLogPath)) {
    const logContent = fs.readFileSync(fullLogPath, 'utf8');
    const playerInfo = extractPlayerInfo(logContent);
    sessionData.players = playerInfo.players;
    sessionData.characterToPlayer = playerInfo.characterToPlayer;
    
    console.log(`\nPlayer Information:`);
    for (const [playerName, playerData] of Object.entries(playerInfo.players)) {
      console.log(`- ${playerName}: ${playerData.characters.join(', ')}`);
    }
  }
  
  for (const file of files) {
    const dayMatch = file.match(/day_(\d+)_(\d+)\.txt/);
    if (dayMatch) {
      const month = parseInt(dayMatch[1]);
      const day = parseInt(dayMatch[2]);
      const dayKey = `${month}_${day}`;
      
      const filePath = path.join(SESSION_DIR, file);
      const dayData = parseDayFile(filePath);
      
      // Add player information to character turns
      dayData.characterTurns.forEach(turn => {
        turn.player = sessionData.characterToPlayer[turn.character] || 'Unknown';
      });
      
      sessionData.days[dayKey] = {
        month,
        day,
        ...dayData
      };
      
      console.log(`Parsed ${file}: ${dayData.characterTurns.length} character turns, ${dayData.battles.length} battles`);
    }
  }
  
  return sessionData;
}

function main() {
  // Use first .rslog in current directory if no argument
  let logFile = process.argv[2] || DEFAULT_LOG_FILE();
  if (!logFile) {
    console.error('No .rslog file found in current directory.');
    process.exit(1);
  }
  // Output parsed_session.json in current directory
  const sessionName = logFile.replace('.rslog', '');
  SESSION_DIR = '.';
  OUTPUT_FILE = path.join(SESSION_DIR, 'parsed_session.json');
  LOG_FILE = logFile;
  
  console.log(`Starting detailed game log parser for: ${sessionName}`);
  
  // First, run the basic parser to split into days
  const { execSync } = require('child_process');
  
  try {
    // Run the basic parser with the log file name
    console.log('Running basic parser to split into days...');
    execSync(`node ../../../scripts/parse_game_log.js ${logFile}`, {
      stdio: 'inherit',
      cwd: SESSION_DIR
    });
    // Now run the detailed parser
    console.log('\nRunning detailed parser...');
    const sessionData = parseAllDays(sessionName);
    // Save the parsed data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`\nParsing complete!`);
    console.log(`Total days parsed: ${Object.keys(sessionData.days).length}`);
    console.log(`Output saved to: ${OUTPUT_FILE}`);
    
    // Show some statistics
    let totalCharacterTurns = 0;
    let totalBattles = 0;
    let totalActions = 0;
    const characterSet = new Set();
    
    for (const [dayKey, dayData] of Object.entries(sessionData.days)) {
      totalCharacterTurns += dayData.characterTurns.length;
      totalBattles += dayData.battles.length;
      dayData.characterTurns.forEach(turn => {
        totalActions += turn.actions.length;
        characterSet.add(turn.character);
      });
    }
    
    console.log(`\nStatistics:`);
    console.log(`- Total character turns: ${totalCharacterTurns}`);
    console.log(`- Total battles: ${totalBattles}`);
    console.log(`- Total actions: ${totalActions}`);
    console.log(`- Unique characters: ${characterSet.size}`);
    console.log(`- Players: ${Object.keys(sessionData.players).length}`);
    
  } catch (error) {
    console.error('Error parsing game log:', error);
    process.exit(1);
  }
}

if (require.main === module) {
main(); 
} 