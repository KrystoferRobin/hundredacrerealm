// Test script for Character Assignment API

async function testCharacterAssignments() {
  console.log('🧪 Testing Character Assignment API\n');

  try {
    // Test getting character assignments
    console.log('1. Testing character assignment listing...');
    const listResponse = await fetch('http://localhost:3000/api/admin/character-assignments');
    const listData = await listResponse.json();
    
    if (listData.sessions) {
      console.log('✅ Character assignment listing successful');
      console.log(`Found ${listData.sessions.length} sessions`);
      
      if (listData.sessions.length > 0) {
        const firstSession = listData.sessions[0];
        console.log(`\nSample session: ${firstSession.name}`);
        console.log(`Characters: ${firstSession.characters.length}`);
        
        if (firstSession.characters.length > 0) {
          const firstCharacter = firstSession.characters[0];
          console.log(`Sample character: ${firstCharacter.characterName} (played by ${firstCharacter.playerName})`);
          
          // Test updating a character assignment
          console.log('\n2. Testing character assignment update...');
          const newPlayerName = `TestPlayer_${Date.now()}`;
          
          const updateResponse = await fetch('http://localhost:3000/api/admin/character-assignments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: firstSession.sessionId,
              characterName: firstCharacter.characterName,
              newPlayerName: newPlayerName
            })
          });
          
          const updateData = await updateResponse.json();
          
          if (updateData.success) {
            console.log('✅ Character assignment update successful!');
            console.log('Message:', updateData.message);
            
            // Verify the update by reading again
            console.log('\n3. Verifying update by reading again...');
            const verifyResponse = await fetch('http://localhost:3000/api/admin/character-assignments');
            const verifyData = await verifyResponse.json();
            
            const updatedSession = verifyData.sessions.find(s => s.sessionId === firstSession.sessionId);
            const updatedCharacter = updatedSession?.characters.find(c => c.characterName === firstCharacter.characterName);
            
            if (updatedCharacter && updatedCharacter.playerName === newPlayerName) {
              console.log('✅ Update verification successful!');
              console.log(`Character ${firstCharacter.characterName} is now played by ${updatedCharacter.playerName}`);
              
              // Revert the change back to original
              console.log('\n4. Reverting change back to original...');
              const revertResponse = await fetch('http://localhost:3000/api/admin/character-assignments', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sessionId: firstSession.sessionId,
                  characterName: firstCharacter.characterName,
                  newPlayerName: firstCharacter.playerName
                })
              });
              
              const revertData = await revertResponse.json();
              if (revertData.success) {
                console.log('✅ Revert successful!');
              } else {
                console.log('❌ Revert failed:', revertData.error);
              }
            } else {
              console.log('❌ Update verification failed');
            }
          } else {
            console.log('❌ Character assignment update failed:', updateData.error);
          }
        } else {
          console.log('No characters found in first session');
        }
      } else {
        console.log('No sessions found');
      }
    } else {
      console.log('❌ Character assignment listing failed:', listData.error);
    }

    console.log('\n✨ Character Assignment API test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCharacterAssignments(); 