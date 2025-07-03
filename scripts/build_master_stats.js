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
    const parsedSessionFile = path.join(sessionPath, 'parsed_session.json');
    const finalScoresFile = path.join(sessionPath, 'final_scores.json');
    const sessionTitlesFile = path.join(sessionPath, 'session_titles.json');
    const characterInventoriesFile = path.join(sessionPath, 'character_inventories.json');

    if (!fs.existsSync(parsedSessionFile)) continue;

    try {
      const sessionData = JSON.parse(fs.readFileSync(parsedSessionFile, 'utf8'));
      const sessionName = sessionData.sessionName;
      
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

      // Add session to master list
      masterStats.sessions.push({
        sessionId: sessionDir,
        sessionName: sessionName,
        sessionTitle: sessionTitle,
        dayCount: Object.keys(sessionData.days || {}).length,
        characters: sessionData.characterToPlayer || {},
        scores: finalScores
      });

      masterStats.totalSessions++;

      // Analyze characters in this session
      if (sessionData.characterToPlayer) {
        for (const [characterName, playerName] of Object.entries(sessionData.characterToPlayer)) {
          // Initialize character stats if not exists
          if (!masterStats.characters[characterName]) {
            masterStats.characters[characterName] = {
              totalPlays: 0,
              totalDeaths: 0,
              players: new Set(),
              games: [],
              killers: {},
              killed: {},
              totalScore: 0,
              averageScore: 0,
              bestScore: 0,
              worstScore: null
            };
          }

          const charStats = masterStats.characters[characterName];
          charStats.totalPlays++;
          charStats.players.add(playerName);

          // Add game to character's list
          charStats.games.push({
            sessionId: sessionDir,
            sessionName: sessionName,
            sessionTitle: sessionTitle,
            player: playerName,
            score: finalScores[characterName]?.totalScore || null,
            dayCount: Object.keys(sessionData.days || {}).length
          });

          // Update score statistics
          const score = finalScores[characterName]?.totalScore || 0;
          charStats.totalScore += score;
          charStats.averageScore = charStats.totalScore / charStats.totalPlays;
          if (score > charStats.bestScore) charStats.bestScore = score;
          if (charStats.worstScore === null || score < charStats.worstScore) {
            charStats.worstScore = score;
          }

          // Analyze battles for deaths and kills
          for (const [dayKey, dayData] of Object.entries(sessionData.days || {})) {
            if (dayData.battles) {
              for (const battle of dayData.battles) {
                if (battle.rounds) {
                  for (const round of battle.rounds) {
                    // Check for deaths
                    if (round.deaths) {
                      for (const death of round.deaths) {
                        // Check if this character died
                        if (death.includes(characterName) || death.includes(`The ${characterName}`)) {
                          charStats.totalDeaths++;
                          
                          // Try to determine who killed them
                          if (round.attacks) {
                            for (const attack of round.attacks) {
                              if (attack.target && attack.target.includes(characterName)) {
                                const killer = attack.performer || 'Unknown';
                                charStats.killers[killer] = (charStats.killers[killer] || 0) + 1;
                              }
                            }
                          }
                        }
                        
                        // Check if this character killed someone
                        if (round.attacks) {
                          for (const attack of round.attacks) {
                            if (attack.performer && 
                                (attack.performer === characterName || attack.performer === `The ${characterName}`)) {
                              // Check if this attack resulted in a death
                              for (const death of round.deaths) {
                                if (death !== `${characterName} was killed!` && 
                                    death !== `The ${characterName} was killed!`) {
                                  // Extract the name of who was killed
                                  const killedName = death.replace(' was killed!', '');
                                  charStats.killed[killedName] = (charStats.killed[killedName] || 0) + 1;
                                  
                                  // Track monster kills by character
                                  if (!masterStats.monsters.killedByCharacter[characterName]) {
                                    masterStats.monsters.killedByCharacter[characterName] = {};
                                  }
                                  masterStats.monsters.killedByCharacter[characterName][killedName] = 
                                    (masterStats.monsters.killedByCharacter[characterName][killedName] || 0) + 1;
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Track monster spawns
            if (dayData.monsterSpawns) {
              for (const spawn of dayData.monsterSpawns) {
                const monsterName = spawn.monster;
                masterStats.monsters.spawns[monsterName] = (masterStats.monsters.spawns[monsterName] || 0) + 1;
                
                // Track spawn locations
                if (!masterStats.monsters.spawnLocations[monsterName]) {
                  masterStats.monsters.spawnLocations[monsterName] = {};
                }
                const location = spawn.location;
                masterStats.monsters.spawnLocations[monsterName][location] = 
                  (masterStats.monsters.spawnLocations[monsterName][location] || 0) + 1;
              }
            }
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

      // Track monster deaths globally
      for (const [dayKey, dayData] of Object.entries(sessionData.days || {})) {
        if (dayData.battles) {
          for (const battle of dayData.battles) {
            if (battle.rounds) {
              for (const round of battle.rounds) {
                if (round.deaths) {
                  for (const death of round.deaths) {
                    // Extract monster name from death message
                    const monsterName = death.replace(' was killed!', '');
                    if (monsterName && !monsterName.includes('The ')) {
                      masterStats.monsters.killed[monsterName] = (masterStats.monsters.killed[monsterName] || 0) + 1;
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

  return masterStats;
}

// Function to save master stats to file
function saveMasterStats(stats) {
  const statsFile = path.join(__dirname, '../data/master_stats.json');
  const statsDir = path.dirname(statsFile);
  
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
  }
  
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  console.log(`Master stats saved to ${statsFile}`);
}

// Function to load master stats from file
function loadMasterStats() {
  const statsFile = path.join(__dirname, '../data/master_stats.json');
  
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