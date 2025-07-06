// Using built-in fetch (Node 18+)

async function testHallOfFameWebhook() {
  console.log('Testing Hall of Fame webhook...');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/discord-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'send-notification',
        type: 'hall-of-fame'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Hall of Fame notification sent successfully!');
      console.log('Check your Discord channel for the Hall of Fame embed.');
    } else {
      console.log('❌ Error sending Hall of Fame notification:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing Hall of Fame webhook:', error);
  }
}

async function testCustomMessageWebhook() {
  console.log('\nTesting Custom Message webhook...');
  
  // First, get available sessions
  try {
    const sessionsResponse = await fetch('http://localhost:3000/api/admin/discord-webhook', {
      method: 'GET'
    });
    
    const sessionsData = await sessionsResponse.json();
    
    if (sessionsData.sessions && sessionsData.sessions.length > 0) {
      const firstSession = sessionsData.sessions[0];
      
      const customTemplate = `🎮 **{sessionName}** has concluded!
      
🏆 **Champion:** {highestCharacter} ({highestPlayer}) with {highestScore} points
⚔️ **Battles:** {totalBattles} epic encounters
🎯 **Actions:** {totalActions} strategic moves
👥 **Players:** {playerList}
⏱️ **Duration:** {finalDay} ({days} total days)

*What an incredible adventure!* 🗡️✨`;
      
      const response = await fetch('http://localhost:3000/api/admin/discord-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send-notification',
          type: 'custom-message',
          sessionId: firstSession.id,
          customTemplate: customTemplate
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Custom message notification sent successfully!');
        console.log('Check your Discord channel for the custom message embed.');
        console.log('\nTemplate used:');
        console.log(customTemplate);
      } else {
        console.log('❌ Error sending custom message notification:', data.error);
      }
    } else {
      console.log('❌ No sessions available for testing custom message');
    }
  } catch (error) {
    console.error('❌ Error testing custom message webhook:', error);
  }
}

async function runTests() {
  console.log('🧪 Testing Discord Webhook Features\n');
  
  await testHallOfFameWebhook();
  await testCustomMessageWebhook();
  
  console.log('\n✨ Testing complete!');
}

runTests(); 