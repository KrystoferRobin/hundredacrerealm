const fs = require('fs');
const path = require('path');

// Function to analyze character statistics across all parsed sessions
function analyzeCharacterStats(characterName) {
  const parsedSessionsDir = path.join(__dirname, '../realm/parsed_sessions');
  const stats = {
    characterName,
    totalPlays: 0,
    totalDeaths: 0,
    players: [],
    games: [],
    killers: {},
    killed: {},
    sessionDetails: []
  };

  // Check if parsed_sessions directory exists
  console.log('Looking for parsed sessions in:', parsedSessionsDir);
  if (!fs.existsSync(parsedSessionsDir)) {
    console.log('No parsed sessions directory found');
    return stats;
  }
  console.log('Found parsed sessions directory');

  // Get all session directories
  const sessionDirs = fs.readdirSync(parsedSessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const playersSet = new Set();

  for (const sessionDir of sessionDirs) {
    const sessionPath = path.join(parsedSessionsDir, sessionDir);
    const parsedSessionFile = path.join(sessionPath, 'parsed_session.json');
    const finalScoresFile = path.join(sessionPath, 'final_scores.json');
    const sessionTitlesFile = path.join(sessionPath, 'session_titles.json');

    if (!fs.existsSync(parsedSessionFile)) continue;

    try {
      const sessionData = JSON.parse(fs.readFileSync(parsedSessionFile, 'utf8'));
      const sessionName = sessionData.sessionName;
      
      // Check if character appears in this session
      const characterAppears = sessionData.characterToPlayer && 
                              sessionData.characterToPlayer[characterName];
      
      if (characterAppears) {
        stats.totalPlays++;
        const player = sessionData.characterToPlayer[characterName];
        playersSet.add(player);

        // Get session title if available
        let sessionTitle = sessionName;
        if (fs.existsSync(sessionTitlesFile)) {
          try {
            const titlesData = JSON.parse(fs.readFileSync(sessionTitlesFile, 'utf8'));
            sessionTitle = titlesData.title || sessionName;
          } catch (e) {
            console.log(`Error reading session titles for ${sessionDir}:`, e.message);
          }
        }

        // Get character score if available
        let characterScore = null;
        if (fs.existsSync(finalScoresFile)) {
          try {
            const scoresData = JSON.parse(fs.readFileSync(finalScoresFile, 'utf8'));
            if (scoresData[characterName]) {
              characterScore = scoresData[characterName].totalScore;
            }
          } catch (e) {
            console.log(`Error reading final scores for ${sessionDir}:`, e.message);
          }
        }

        // Add game to list
        stats.games.push({
          sessionId: sessionDir,
          sessionName: sessionName,
          sessionTitle: sessionTitle,
          player: player,
          score: characterScore
        });

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
                        stats.totalDeaths++;
                        
                        // Try to determine who killed them
                        // Look for attacks in the same round
                        if (round.attacks) {
                          for (const attack of round.attacks) {
                            if (attack.target && attack.target.includes(characterName)) {
                              const killer = attack.performer || 'Unknown';
                              stats.killers[killer] = (stats.killers[killer] || 0) + 1;
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
                                stats.killed[killedName] = (stats.killed[killedName] || 0) + 1;
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
        }

        // Add session details
        stats.sessionDetails.push({
          sessionId: sessionDir,
          sessionName: sessionName,
          sessionTitle: sessionTitle,
          player: player,
          score: characterScore,
          dayCount: Object.keys(sessionData.days || {}).length
        });
      }
    } catch (error) {
      console.log(`Error processing session ${sessionDir}:`, error.message);
    }
  }

  // Convert set to array for JSON serialization
  stats.players = Array.from(playersSet);

  return stats;
}

// Function to get top killers and killed
function getTopKillersAndKilled(stats) {
  const topKillers = Object.entries(stats.killers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topKilled = Object.entries(stats.killed)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { topKillers, topKilled };
}

// Export functions for use in API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeCharacterStats,
    getTopKillersAndKilled
  };
}

// If run directly, test with a character
if (require.main === module) {
  const characterName = process.argv[2] || 'Wizard';
  console.log(`Analyzing stats for ${characterName}...`);
  
  const stats = analyzeCharacterStats(characterName);
  const { topKillers, topKilled } = getTopKillersAndKilled(stats);
  
  console.log('\n=== CHARACTER STATISTICS ===');
  console.log(`Character: ${stats.characterName}`);
  console.log(`Total Plays: ${stats.totalPlays}`);
  console.log(`Total Deaths: ${stats.totalDeaths}`);
  console.log(`Players: ${stats.players.join(', ')}`);
  
  console.log('\n=== TOP KILLERS ===');
  topKillers.forEach((killer, index) => {
    console.log(`${index + 1}. ${killer.name}: ${killer.count} times`);
  });
  
  console.log('\n=== TOP KILLED ===');
  topKilled.forEach((killed, index) => {
    console.log(`${index + 1}. ${killed.name}: ${killed.count} times`);
  });
  
  console.log('\n=== GAMES ===');
  stats.games.forEach(game => {
    console.log(`${game.sessionTitle} (${game.player}) - Score: ${game.score || 'N/A'}`);
  });
} 