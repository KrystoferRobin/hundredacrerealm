const { getWebhook } = require('./discord_webhook');

async function testWebhook() {
  console.log('🧪 Testing Discord Webhook...');
  
  const webhook = getWebhook();
  
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.log('❌ DISCORD_WEBHOOK_URL environment variable not set');
    console.log('Please set it to your Discord webhook URL');
    return;
  }
  
  try {
    // Test 1: Simple message
    console.log('1. Testing simple message...');
    await webhook.sendMessage('🧪 Test message from Magic Realm Parser');
    
    // Test 2: Processing start notification
    console.log('2. Testing processing start notification...');
    await webhook.sendProcessingStart('TestSession_2024-01-01');
    
    // Test 3: Session completion notification
    console.log('3. Testing session completion notification...');
    const testSessionData = {
      name: 'Test Adventure',
      players: 3,
      characters: 4,
      totalCharacterTurns: 45,
      totalBattles: 12,
      totalActions: 156,
      uniqueCharacters: 4,
      days: 5,
      finalDay: '1m5d'
    };
    await webhook.sendSessionComplete(testSessionData, 'test_session_123', 'http://localhost:3000');
    
    // Test 4: Error notification
    console.log('4. Testing error notification...');
    const testError = new Error('Test error message');
    await webhook.sendProcessingError('TestSession_2024-01-01', testError);
    
    // Test 5: Batch summary
    console.log('5. Testing batch summary...');
    const testResults = [
      { sessionName: 'Session1', success: true },
      { sessionName: 'Session2', success: true },
      { sessionName: 'Session3', success: false, error: 'Test error' }
    ];
    await webhook.sendBatchSummary(testResults);
    
    // Test 6: Statistics update
    console.log('6. Testing statistics update...');
    const testStats = {
      totalSessions: 150,
      totalPlayers: 25,
      totalCharacters: 45,
      totalBattles: 1200,
      totalActions: 5000
    };
    await webhook.sendStatsUpdate(testStats);
    
    console.log('✅ All webhook tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
}

testWebhook(); 