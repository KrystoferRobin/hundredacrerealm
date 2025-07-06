const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Your Discord webhook URL
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1391313317712236625/y9385uSHITd2NYrPjsvpaRXBkoD5TlVBihGofvFMzewYOfkRpW9C6mZboFcPqLKWPvm-';

async function sendDiscordMessage(content, options = {}) {
  const message = {
    content: options.content || content,
    embeds: options.embeds || [],
    username: options.username || 'TheRealm Parser',
    avatar_url: options.avatar_url || null
  };

  if (options.embed) {
    message.embeds.push(options.embed);
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(WEBHOOK_URL);
    const postData = JSON.stringify(message);

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Discord notification sent successfully!');
          resolve(data);
        } else {
          console.error('❌ Discord webhook error:', res.statusCode, data);
          reject(new Error(`Discord webhook failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Discord webhook request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

function extractSessionData(sessionFolder) {
  try {
    const sessionDataPath = path.join(sessionFolder, 'parsed_session.json');
    const finalScoresPath = path.join(sessionFolder, 'final_scores.json');
    
    let sessionData = null;
    let finalScores = null;
    
    if (fs.existsSync(sessionDataPath)) {
      sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
    }
    
    if (fs.existsSync(finalScoresPath)) {
      finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
    }
    
    // Calculate basic stats
    let totalCharacterTurns = 0;
    let totalBattles = 0;
    let totalActions = 0;
    const uniqueCharacters = new Set();
    
    if (sessionData && sessionData.days) {
      Object.values(sessionData.days).forEach((dayData) => {
        totalCharacterTurns += (dayData.characterTurns || []).length;
        totalBattles += (dayData.battles || []).length;
        (dayData.characterTurns || []).forEach((turn) => {
          if (turn.character && !turn.character.includes('HQ')) {
            uniqueCharacters.add(turn.character);
          }
          totalActions += (turn.actions || []).length;
        });
      });
    }
    
    const characters = sessionData?.characterToPlayer || {};
    const characterCount = Object.keys(characters).length;
    const playerCount = new Set(Object.values(characters)).size;
    
    // Calculate final day
    const totalDays = sessionData?.days ? Object.keys(sessionData.days).length : 0;
    const finalDayNum = totalDays > 0 ? totalDays - 1 : 0;
    const months = Math.floor(finalDayNum / 28) + 1;
    const dayNum = (finalDayNum % 28) + 1;
    const finalDay = `${months}m${dayNum}d`;
    
    // Find highest scoring character
    let highestScore = 0;
    let highestCharacter = null;
    let highestPlayer = null;
    
    if (finalScores) {
      Object.entries(finalScores).forEach(([characterName, scoreData]) => {
        if (scoreData.totalScore > highestScore) {
          highestScore = scoreData.totalScore;
          highestCharacter = characterName;
          highestPlayer = sessionData?.characterToPlayer?.[characterName] || 'Unknown';
        }
      });
    }
    
    // Get list of players
    const players = sessionData?.players ? Object.keys(sessionData.players) : [];
    const playerList = players.join(', ');
    
    return {
      name: sessionData?.sessionName || 'Unknown Session',
      players: playerCount,
      characters: characterCount,
      totalCharacterTurns,
      totalBattles,
      totalActions,
      uniqueCharacters: uniqueCharacters.size,
      days: totalDays,
      finalDay,
      playerList,
      highestCharacter,
      highestPlayer,
      highestScore
    };
  } catch (error) {
    console.error('Error extracting session data:', error);
    return {
      name: 'Unknown Session',
      players: 0,
      characters: 0,
      totalCharacterTurns: 0,
      totalBattles: 0,
      totalActions: 0,
      uniqueCharacters: 0,
      days: 0,
      finalDay: 'Unknown',
      playerList: '',
      highestCharacter: null,
      highestPlayer: null,
      highestScore: 0
    };
  }
}

async function sendCustomSessionNotification(sessionData, sessionId, baseUrl = 'http://localhost:3000') {
  // Create main title and subtitle
  const mainTitle = sessionData.name;
  const subtitle = `${sessionData.finalDay} • ${sessionData.totalBattles} battles • ${sessionData.totalActions} actions`;
  
  // Create character and player info
  const characterInfo = `${sessionData.characters} Characters, ${sessionData.playerList}`;
  
  // Create highest scoring character info
  let highestScoreInfo = '';
  if (sessionData.highestCharacter && sessionData.highestPlayer) {
    highestScoreInfo = `Highest Score: **${sessionData.highestCharacter}** (${sessionData.highestPlayer}) - ${sessionData.highestScore} points`;
  }
  
  // Create the embed
  const embed = {
    title: mainTitle,
    description: `${subtitle}\n${characterInfo}\n${highestScoreInfo}`,
    color: 0x00ff00, // Green
    url: `${baseUrl}/session/${sessionId}`,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Click to view session details'
    }
  };

  return sendDiscordMessage('', { embed });
}

async function testCustomWebhook() {
  console.log('🧪 Testing Custom Discord Webhook Format...');
  
  try {
    // Extract data from your existing session
    const sessionFolder = 'public/parsed_sessions/6-13-25-WK-002-V_2025-07-06T00-19-34_tyhauxij';
    const sessionId = '6-13-25-WK-002-V_2025-07-06T00-19-34_tyhauxij';
    
    console.log('📊 Extracting session data...');
    const sessionData = extractSessionData(sessionFolder);
    
    console.log('📤 Sending custom notification...');
    await sendCustomSessionNotification(sessionData, sessionId, 'http://localhost:3000');
    
    console.log('✅ Custom webhook test completed!');
    console.log('\n📋 Session Data Extracted:');
    console.log(`- Main Title: ${sessionData.name}`);
    console.log(`- Subtitle: ${sessionData.finalDay} • ${sessionData.totalBattles} battles • ${sessionData.totalActions} actions`);
    console.log(`- Characters & Players: ${sessionData.characters} Characters, ${sessionData.playerList}`);
    console.log(`- Highest Score: ${sessionData.highestCharacter} (${sessionData.highestPlayer}) - ${sessionData.highestScore} points`);
    
  } catch (error) {
    console.error('❌ Custom webhook test failed:', error.message);
  }
}

testCustomWebhook(); 