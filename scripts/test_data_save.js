// Test script for Data Management Save API

async function testDataSave() {
  console.log('🧪 Testing Data Management Save API\n');

  try {
    // First, read a file to get its content
    console.log('1. Reading a test file...');
    const readResponse = await fetch('http://localhost:3000/api/admin/data-management?action=read&path=public/stats/session_titles.json');
    const readData = await readResponse.json();
    
    if (!readData.content) {
      console.log('❌ Could not read test file:', readData.error);
      return;
    }
    
    console.log('✅ File read successfully');
    console.log('Original content:', JSON.stringify(readData.content, null, 2));
    
    // Modify the content slightly
    const modifiedContent = {
      ...readData.content,
      testField: 'This is a test modification',
      timestamp: new Date().toISOString()
    };
    
    console.log('\n2. Saving modified content...');
    const saveResponse = await fetch('http://localhost:3000/api/admin/data-management', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'save',
        filePath: 'public/stats/session_titles.json',
        content: modifiedContent
      })
    });
    
    const saveData = await saveResponse.json();
    
    if (saveData.success) {
      console.log('✅ File saved successfully!');
      console.log('Message:', saveData.message);
      
      // Verify the save by reading the file again
      console.log('\n3. Verifying save by reading file again...');
      const verifyResponse = await fetch('http://localhost:3000/api/admin/data-management?action=read&path=public/stats/session_titles.json');
      const verifyData = await verifyResponse.json();
      
      if (verifyData.content && verifyData.content.testField) {
        console.log('✅ Save verification successful!');
        console.log('New content includes test field:', verifyData.content.testField);
      } else {
        console.log('❌ Save verification failed - test field not found');
      }
      
    } else {
      console.log('❌ File save failed:', saveData.error);
    }
    
    console.log('\n✨ Data Management Save API test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDataSave(); 