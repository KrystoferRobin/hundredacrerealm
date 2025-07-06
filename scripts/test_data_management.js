// Test script for Data Management API

async function testDataManagementAPI() {
  console.log('🧪 Testing Data Management API\n');

  try {
    // Test listing files
    console.log('1. Testing file listing...');
    const listResponse = await fetch('http://localhost:3000/api/admin/data-management?action=list');
    const listData = await listResponse.json();
    
    if (listData.files) {
      console.log('✅ File listing successful');
      console.log('Categories found:', Object.keys(listData.files));
      
      // Show some sample files
      Object.entries(listData.files).forEach(([category, files]) => {
        console.log(`  ${category}: ${files.length} files`);
        if (files.length > 0) {
          console.log(`    Sample: ${files[0].name} (${files[0].path})`);
        }
      });
    } else {
      console.log('❌ File listing failed:', listData.error);
    }

    // Test reading a specific file (if any files exist)
    if (listData.files && Object.values(listData.files).some(files => files.length > 0)) {
      console.log('\n2. Testing file reading...');
      
      // Find the first available file
      let firstFile = null;
      for (const [category, files] of Object.entries(listData.files)) {
        if (files.length > 0) {
          firstFile = files[0];
          break;
        }
      }
      
      if (firstFile) {
        console.log(`Reading file: ${firstFile.path}`);
        const readResponse = await fetch(`http://localhost:3000/api/admin/data-management?action=read&path=${encodeURIComponent(firstFile.path)}`);
        const readData = await readResponse.json();
        
        if (readData.content) {
          console.log('✅ File reading successful');
          console.log(`  File size: ${readData.stats.size} bytes`);
          console.log(`  Modified: ${readData.stats.modified}`);
          console.log(`  Content keys: ${Object.keys(readData.content).join(', ')}`);
        } else {
          console.log('❌ File reading failed:', readData.error);
        }
      }
    }

    console.log('\n✨ Data Management API test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDataManagementAPI(); 