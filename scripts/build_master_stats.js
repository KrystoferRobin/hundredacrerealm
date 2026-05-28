const fs = require('fs');
const path = require('path');

// Master statistics object
const masterStats = {
  lastUpdated: new Date().toISOString(),
  totalSessions: 0,
  characters: {},
  treasures: {
    found: {},
    sold: {},
    byCharacter: {}
  },
  monsters: {
    spawns: {},
    killed: {},
    killedByCharacter: {},
    spawnLocations: {}
  },
  sessions: []
};

// Function to analyze all sessions and build master statistics
function buildMasterStats() {
  console.log('Building master statistics...');
  
  const parsedSessionsDir = path.join(__dirname, '../public/parsed_sessions');
  
  console.log('Looking for parsed sessions in:', parsedSessionsDir);
  
  if (!fs.existsSync(parsedSessionsDir)) {
    console.log('No parsed sessions directory found');
    return masterStats;
  }

  // Reset stats
  Object.assign(masterStats, {
    lastUpdated: new Date().toISOString(),
    totalSessions: 0,
    characters: {},
    treasures: {
      found: {},
      sold: {},
      byCharacter: {}
    },
    monsters: {
      spawns: {},
      killed: {},
      killedByCharacter: {},
      spawnLocations: {}
    },
    sessions: []
  });

  // Get all session directories
  const sessionDirs = fs.readdirSync(parsedSessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${sessionDirs.length} sessions to analyze...`);

  for (const sessionDir of sessionDirs) {
    const sessionPath = path.join(parsedSessionsDir, sessionDir);
    
    // Try different possible session data files
    const possibleFiles = [
      'parsed_session.json',
      'session_data.json',
      'session.json'
    ];
    
    let sessionData = null;
    let sessionFile = null;
    
    for (const filename of possibleFiles) {
      const filePath = path.join(sessionPath, filename);
      if (fs.existsSync(filePath)) {
        try {
          sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          sessionFile = filePath;
          break;
        } catch (e) {
          console.log(`Error reading ${filename} for ${sessionDir}:`, e.message);
        }
      }
    }
    
    if (!sessionData) continue;
    
    const finalScoresFile = path.join(sessionPath, 'final_scores.json');
    const sessionTitlesFile = path.join(sessionPath, 'public', 'stats', 'session_titles.json');
    const characterInventoriesFile = path.join(sessionPath, 'character_inventories.json');

    try {
      const sessionName = sessionData.sessionTitle || sessionData.sessionName || sessionDir;
      const sessionId = sessionData.sessionId || sessionDir;
      
      // Get session title
      let sessionTitle = sessionName;
      if (fs.existsSync(sessionTitlesFile)) {
        try {
          const titlesData = JSON.parse(fs.readFileSync(sessionTitlesFile, 'utf8'));
          sessionTitle = titlesData.title || sessionName;
        } catch (e) {
          console.log(`Error reading session titles for ${sessionDir}:`, e.message);
        }
      }

      // Get final scores
      let finalScores = {};
      if (fs.existsSync(finalScoresFile)) {
        try {
          finalScores = JSON.parse(fs.readFileSync(finalScoresFile, 'utf8'));
        } catch (e) {
          console.log(`Error reading final scores for ${sessionDir}:`, e.message);
        }
      }

      // Get character inventories
      let characterInventories = {};
      if (fs.existsSync(characterInventoriesFile)) {
        try {
          characterInventories = JSON.parse(fs.readFileSync(characterInventoriesFile, 'utf8'));
        } catch (e) {
          console.log(`Error reading character inventories for ${sessionDir}:`, e.message);
        }
      }

      // --- Find dead characters at end of session ---
      const deadCharacters = new Set();
      for (const dayData of Object.values(sessionData.days || {})) {
        if (dayData.battles) {
          for (const battle of dayData.battles) {
            if (battle.rounds) {
              for (const round of battle.rounds) {
                if (round.deaths) {
                  for (const death of round.deaths) {
                    const match = death.match(/^(.*?) was killed!/);
                    if (match) {
                      deadCharacters.add(match[1]);
                    }
                  }
                }
              }
            }
          }
        }
      }
      // ---

      // Add session to master list
      let sessionCharacters = {};
      let sessionScores = {};
      if (sessionData.characterToPlayer && Object.keys(sessionData.characterToPlayer).length > 0) {
        for (const [character, player] of Object.entries(sessionData.characterToPlayer)) {
          sessionCharacters[character] = player;
          let score = 0;
          let isDead = 0;
          if (finalScores && finalScores[character] && typeof finalScores[character].totalScore === 'number') {
            score = finalScores[character].totalScore;
          }
          if (deadCharacters.has(character)) {
            score = -100;
            isDead = 1;
          }
          sessionScores[character] = { totalScore: score, isDead };

          // Initialize character stats if not exists
          if (!masterStats.characters[character]) {
            masterStats.characters[character] = {
              totalPlays: 0,
              totalDeaths: 0,
              players: [],
              games: [],
              killers: {},
              killed: {}
            };
          }

          // Add player to character's player list if not already there
          if (!masterStats.characters[character].players.includes(player)) {
            masterStats.characters[character].players.push(player);
          }

          // Add game to character's games list (with isDead and penalized score)
          masterStats.characters[character].games.push({
            sessionId: sessionId,
            sessionName: sessionName,
            sessionTitle: sessionTitle,
            player: player,
            score: score,
            isDead: isDead,
            dayCount: sessionData.totalDays || 0
          });

          masterStats.characters[character].totalPlays++;
        }
      } else {
        // Fallback for single character sessions
        const character = sessionData.character || 'Unknown';
        const player = sessionData.player || 'Unknown';
        let score = sessionData.finalScore || 0;
        let isDead = 0;
        if (deadCharacters.has(character)) {
          score = -100;
          isDead = 1;
        }
        sessionCharacters[character] = player;
        sessionScores[character] = { totalScore: score, isDead };

        if (!masterStats.characters[character]) {
          masterStats.characters[character] = {
            totalPlays: 0,
            totalDeaths: 0,
            players: [],
            games: [],
            killers: {},
            killed: {}
          };
        }

        if (!masterStats.characters[character].players.includes(player)) {
          masterStats.characters[character].players.push(player);
        }

        masterStats.characters[character].games.push({
          sessionId: sessionId,
          sessionName: sessionName,
          sessionTitle: sessionTitle,
          player: player,
          score: score,
          isDead: isDead,
          dayCount: sessionData.totalDays || 0
        });
        masterStats.characters[character].totalPlays++;
      }

      masterStats.sessions.push({
        sessionId: sessionId,
        sessionName: sessionName,
        sessionTitle: sessionTitle,
        dayCount: sessionData.totalDays || 0,
        characters: sessionCharacters,
        scores: sessionScores
      });

      masterStats.totalSessions++;

      // Analyze characters in this session
      const characterName = sessionData.character;
      const playerName = sessionData.player;
      
      if (characterName && playerName) {
          // Initialize character stats if not exists
          if (!masterStats.characters[characterName]) {
            masterStats.characters[characterName] = {
              totalPlays: 0,
              totalDeaths: 0,
              players: [],
              games: [],
              killers: {},
              killed: {}
            };
          }

          const charStats = masterStats.characters[characterName];
          charStats.totalPlays++;
          charStats.players.push(playerName);

          // Add game to character's list
          charStats.games.push({
            sessionId: sessionId,
            sessionName: sessionName,
            sessionTitle: sessionTitle,
            player: playerName,
            score: score,
            isDead: isDead,
            dayCount: sessionData.totalDays || 0
          });

          // Update score statistics
          charStats.totalScore += score;
          charStats.averageScore = charStats.totalScore / charStats.totalPlays;
          if (score > charStats.bestScore) charStats.bestScore = score;
          if (charStats.worstScore === null || score < charStats.worstScore) {
            charStats.worstScore = score;
          }

          // Analyze combat data from mock data
          if (sessionData.combat) {
            // Track deaths (simplified)
            const defeats = sessionData.combat.battles.filter((battle) => battle.result === 'defeat').length;
            charStats.totalDeaths += defeats;

            // Track kills
            for (const battle of sessionData.combat.battles) {
              if (battle.result === 'victory' && battle.monster) {
                charStats.killed[battle.monster] = (charStats.killed[battle.monster] || 0) + 1;
                
                // Track monster kills by character
                if (!masterStats.monsters.killedByCharacter[characterName]) {
                  masterStats.monsters.killedByCharacter[characterName] = {};
                }
                masterStats.monsters.killedByCharacter[characterName][battle.monster] = 
                  (masterStats.monsters.killedByCharacter[characterName][battle.monster] || 0) + 1;
                
                // Track global monster kills
                masterStats.monsters.killed[battle.monster] = (masterStats.monsters.killed[battle.monster] || 0) + 1;
              }
            }
          }

          // Analyze treasure data from mock data
          if (sessionData.treasure) {
            for (const treasure of sessionData.treasure.found || []) {
              const treasureName = treasure.name;
              
              // Global treasure found stats
              masterStats.treasures.found[treasureName] = (masterStats.treasures.found[treasureName] || 0) + 1;
              
              // Character-specific treasure found stats
              if (!masterStats.treasures.byCharacter[characterName]) {
                masterStats.treasures.byCharacter[characterName] = {
                  found: {},
                  sold: {}
                };
              }
              masterStats.treasures.byCharacter[characterName].found[treasureName] = 
                (masterStats.treasures.byCharacter[characterName].found[treasureName] || 0) + 1;
            }
          }
        }

      // Analyze character inventories for treasures
      if (characterInventories) {
        for (const [characterName, inventory] of Object.entries(characterInventories)) {
          if (!masterStats.treasures.byCharacter[characterName]) {
            masterStats.treasures.byCharacter[characterName] = {
              found: {},
              sold: {}
            };
          }

          // Track treasures found
          if (inventory.treasures) {
            for (const treasure of inventory.treasures) {
              const treasureName = treasure.name;
              
              // Global treasure found stats
              masterStats.treasures.found[treasureName] = (masterStats.treasures.found[treasureName] || 0) + 1;
              
              // Character-specific treasure found stats
              masterStats.treasures.byCharacter[characterName].found[treasureName] = 
                (masterStats.treasures.byCharacter[characterName].found[treasureName] || 0) + 1;
            }
          }

          // Track treasures sold (this would need to be parsed from the session logs)
          // For now, we'll need to look for "sold" actions in the parsed session
          for (const [dayKey, dayData] of Object.entries(sessionData.days || {})) {
            if (dayData.characterTurns) {
              for (const turn of dayData.characterTurns) {
                if (turn.character === characterName && turn.actions) {
                  for (const action of turn.actions) {
                    if (action.action && action.action.toLowerCase().includes('sell')) {
                      // This is a simplified approach - we'd need more sophisticated parsing
                      // to extract the specific treasure name from the action
                      console.log(`Found sell action for ${characterName}:`, action.action);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Track monster deaths globally and character deaths
      for (const [dayKey, dayData] of Object.entries(sessionData.days || {})) {
        if (dayData.battles) {
          for (const battle of dayData.battles) {
            if (battle.rounds) {
              for (const round of battle.rounds) {
                if (round.deaths) {
                  for (const death of round.deaths) {
                    // Extract name from death message
                    const deathName = death.replace(' was killed!', '');
                    if (deathName && !deathName.includes('The ')) {
                      // Check if this is a character death by looking at characterToPlayer
                      if (sessionData.characterToPlayer && sessionData.characterToPlayer[deathName]) {
                        // This is a character death
                        if (!masterStats.characters[deathName]) {
                          masterStats.characters[deathName] = {
                            totalPlays: 0,
                            totalDeaths: 0,
                            players: [],
                            games: [],
                            killers: {},
                            killed: {}
                          };
                        }
                        masterStats.characters[deathName].totalDeaths++;
                        console.log(`Character death recorded: ${deathName} in session ${sessionDir}`);
                      } else {
                        // This is a monster death
                        masterStats.monsters.killed[deathName] = (masterStats.monsters.killed[deathName] || 0) + 1;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.log(`Error processing session ${sessionDir}:`, error.message);
    }
  }

  // Convert sets to arrays for JSON serialization
  for (const charName in masterStats.characters) {
    masterStats.characters[charName].players = Array.from(masterStats.characters[charName].players);
  }

  // Calculate top statistics
  masterStats.topStats = {
    mostPlayedCharacters: Object.entries(masterStats.characters)
      .sort(([,a], [,b]) => b.totalPlays - a.totalPlays)
      .slice(0, 10)
      .map(([name, stats]) => ({ name, plays: stats.totalPlays })),

    mostDeadlyCharacters: Object.entries(masterStats.characters)
      .sort(([,a], [,b]) => b.totalDeaths - a.totalDeaths)
      .slice(0, 10)
      .map(([name, stats]) => ({ name, deaths: stats.totalDeaths })),

    mostFoundTreasures: Object.entries(masterStats.treasures.found)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),

    mostSpawnedMonsters: Object.entries(masterStats.monsters.spawns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),

    mostKilledMonsters: Object.entries(masterStats.monsters.killed)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  };

  // After all sessions processed, calculate headerStats
  masterStats.headerStats = {
    totalGold: 0,
    totalGreatTreasures: 0,
    totalMonstersKilled: 0,
    totalCharactersKilled: 0
  };
  
  // Calculate header stats from final scores
  for (const sessionDir of sessionDirs) {
    try {
      const finalScoresPath = path.join(parsedSessionsDir, sessionDir, 'final_scores.json');
      if (fs.existsSync(finalScoresPath)) {
        const finalScoresData = fs.readFileSync(finalScoresPath, 'utf8');
        const finalScores = JSON.parse(finalScoresData);
        
        for (const [character, scoreData] of Object.entries(finalScores)) {
          if (scoreData.categories) {
            // Add gold from categories.gold.actual
            if (scoreData.categories.gold && typeof scoreData.categories.gold.actual === 'number') {
              masterStats.headerStats.totalGold += scoreData.categories.gold.actual;
            }
            
            // Add great treasures from categories.greatTreasures.actual
            if (scoreData.categories.greatTreasures && typeof scoreData.categories.greatTreasures.actual === 'number') {
              masterStats.headerStats.totalGreatTreasures += scoreData.categories.greatTreasures.actual;
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error processing final scores for ${sessionDir}:`, error.message);
    }
  }
  
  masterStats.headerStats.totalMonstersKilled = Object.values(masterStats.monsters.killed).reduce((a, b) => a + b, 0);
  masterStats.headerStats.totalCharactersKilled = Object.values(masterStats.characters).reduce((sum, char) => sum + (char.totalDeaths || 0), 0);

  return masterStats;
}

// Function to save master stats to file
function saveMasterStats(stats) {
  const statsFile = path.join(__dirname, '../public/stats/master_stats.json');
  const statsDir = path.dirname(statsFile);
  
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
  }
  
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  console.log(`Master stats saved to ${statsFile}`);
}

// Function to load master stats from file
function loadMasterStats() {
  const statsFile = path.join(__dirname, '../public/stats/master_stats.json');
  
  if (fs.existsSync(statsFile)) {
    try {
      return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch (error) {
      console.log('Error loading master stats:', error.message);
    }
  }
  
  return null;
}

// Main execution
if (require.main === module) {
  console.log('Building master statistics...');
  const stats = buildMasterStats();
  saveMasterStats(stats);
  console.log('Master statistics build complete!');
  
  // Print some summary stats
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Sessions: ${stats.totalSessions}`);
  console.log(`Total Characters: ${Object.keys(stats.characters).length}`);
  console.log(`Total Treasures Found: ${Object.keys(stats.treasures.found).length}`);
  console.log(`Total Monsters Spawned: ${Object.keys(stats.monsters.spawns).length}`);
  console.log(`Total Monsters Killed: ${Object.keys(stats.monsters.killed).length}`);
}

// Export functions for use in API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildMasterStats,
    saveMasterStats,
    loadMasterStats
  };
} 