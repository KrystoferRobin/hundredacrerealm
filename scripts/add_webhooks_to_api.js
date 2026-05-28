// Example: Adding Discord webhooks to your existing API endpoints
// This shows how you could enhance your current API routes with notifications

const { getWebhook } = require('./discord_webhook');

// Example: Enhanced game-sessions API route with webhooks
async function enhancedGameSessionsAPI() {
  const webhook = getWebhook();
  
  try {
    // Your existing API logic here...
    console.log('Processing game sessions...');
    
    // When a new session is detected or processed
    const newSessionData = {
      name: 'New Adventure Session',
      players: 4,
      characters: 5,
      totalCharacterTurns: 67,
      totalBattles: 18,
      totalActions: 234,
      uniqueCharacters: 5,
      days: 8,
      finalDay: '1m8d'
    };
    
    // Send notification about the new session
    await webhook.sendSessionComplete(newSessionData, 'new_session_123', 'https://your-domain.com');
    
    console.log('Session processed and notification sent!');
    
  } catch (error) {
    // Send error notification
    await webhook.sendProcessingError('API Processing', error);
    console.error('API error:', error);
  }
}

// Example: Enhanced batch processing with progress updates
async function enhancedBatchProcessing(sessions) {
  const webhook = getWebhook();
  const results = [];
  
  // Send start notification
  if (sessions.length > 1) {
    await webhook.sendMessage(`🔄 Starting batch processing of ${sessions.length} sessions...`);
  }
  
  for (const session of sessions) {
    try {
      // Send processing start notification
      await webhook.sendProcessingStart(session.name);
      
      // Your existing processing logic here...
      console.log(`Processing ${session.name}...`);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send completion notification
      const sessionData = {
        name: session.name,
        players: session.players || 0,
        characters: session.characters || 0,
        totalCharacterTurns: session.turns || 0,
        totalBattles: session.battles || 0,
        totalActions: session.actions || 0,
        uniqueCharacters: session.uniqueChars || 0,
        days: session.days || 0,
        finalDay: session.finalDay || 'Unknown'
      };
      
      await webhook.sendSessionComplete(sessionData, session.id, 'https://your-domain.com');
      
      results.push({ sessionName: session.name, success: true });
      
    } catch (error) {
      await webhook.sendProcessingError(session.name, error);
      results.push({ sessionName: session.name, success: false, error: error.message });
    }
  }
  
  // Send batch summary
  if (results.length > 1) {
    await webhook.sendBatchSummary(results);
  }
  
  return results;
}

// Example: Statistics update webhook
async function sendStatisticsUpdate() {
  const webhook = getWebhook();
  
  // Calculate your statistics
  const stats = {
    totalSessions: 150,
    totalPlayers: 25,
    totalCharacters: 45,
    totalBattles: 1200,
    totalActions: 5000
  };
  
  // Send statistics update
  await webhook.sendStatsUpdate(stats);
}

// Example: Custom notification for special events
async function sendSpecialEventNotification(eventType, data) {
  const webhook = getWebhook();
  
  let embed = {
    title: '🎉 Special Event!',
    color: 0xffd700, // Gold
    timestamp: new Date().toISOString(),
    footer: { text: 'Magic Realm Parser' }
  };
  
  switch (eventType) {
    case 'milestone':
      embed.title = '🏆 Milestone Reached!';
      embed.description = `Congratulations! You've reached ${data.milestone} sessions!`;
      embed.fields = [
        { name: 'Milestone', value: data.milestone, inline: true },
        { name: 'Total Sessions', value: data.totalSessions.toString(), inline: true }
      ];
      break;
      
    case 'epic_session':
      embed.title = '⚔️ Epic Session Completed!';
      embed.description = 'This was an incredible game session!';
      embed.fields = [
        { name: 'Session', value: data.name, inline: true },
        { name: 'Battles', value: data.battles.toString(), inline: true },
        { name: 'Duration', value: data.duration, inline: true }
      ];
      break;
      
    case 'new_player':
      embed.title = '👋 New Player!';
      embed.description = `Welcome ${data.playerName} to the realm!`;
      embed.fields = [
        { name: 'Player', value: data.playerName, inline: true },
        { name: 'Character', value: data.character, inline: true }
      ];
      break;
  }
  
  return webhook.sendMessage('', { embed });
}

// Example: Integration with your existing scripts
async function integrateWithExistingScripts() {
  const webhook = getWebhook();
  
  // Example: Add to your existing process_session.js
  console.log('🎮 Processing Magic Realm Session...');
  
  try {
    // Your existing processing logic...
    
    // After successful processing, send notification
    const sessionData = extractSessionData(sessionFolder, sessionName);
    await webhook.sendSessionComplete(sessionData, sessionName, 'https://your-domain.com');
    
    console.log('✅ Session processed and notification sent!');
    
  } catch (error) {
    await webhook.sendProcessingError(sessionName, error);
    console.error('❌ Processing failed:', error);
  }
}

// Example: Scheduled statistics updates
async function scheduledStatsUpdate() {
  const webhook = getWebhook();
  
  // This could be run daily/weekly via cron or similar
  console.log('📊 Running scheduled statistics update...');
  
  try {
    // Calculate your statistics
    const stats = await calculateGlobalStats();
    
    // Send update
    await webhook.sendStatsUpdate(stats);
    
    console.log('✅ Statistics update sent!');
    
  } catch (error) {
    console.error('❌ Statistics update failed:', error);
  }
}

// Helper function to calculate global stats (example)
async function calculateGlobalStats() {
  // Your existing stats calculation logic here
  return {
    totalSessions: 150,
    totalPlayers: 25,
    totalCharacters: 45,
    totalBattles: 1200,
    totalActions: 5000
  };
}

// Export functions for use in other scripts
module.exports = {
  enhancedGameSessionsAPI,
  enhancedBatchProcessing,
  sendStatisticsUpdate,
  sendSpecialEventNotification,
  integrateWithExistingScripts,
  scheduledStatsUpdate
};

// Run examples if this script is executed directly
if (require.main === module) {
  console.log('🔧 Discord Webhook Integration Examples');
  console.log('=====================================');
  
  // Uncomment to test specific examples:
  
  // enhancedGameSessionsAPI();
  // enhancedBatchProcessing([
  //   { name: 'Session1', players: 3, characters: 4, id: 'sess1' },
  //   { name: 'Session2', players: 2, characters: 3, id: 'sess2' }
  // ]);
  // sendStatisticsUpdate();
  // sendSpecialEventNotification('milestone', { milestone: '100 sessions', totalSessions: 100 });
} 