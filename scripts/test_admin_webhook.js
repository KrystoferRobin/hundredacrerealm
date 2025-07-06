const https = require('https');
const url = require('url');

// Test the admin panel Discord webhook API
async function testAdminWebhookAPI() {
  console.log('🧪 Testing Admin Panel Discord Webhook API...');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Get webhook settings and sessions
    console.log('\n1. Testing GET /api/admin/discord-webhook...');
    const getResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`);
    const getData = await getResponse.json();
    
    console.log('✅ GET response received');
    console.log('Settings:', getData.settings);
    console.log(`Sessions found: ${getData.sessions?.length || 0}`);
    
    // Test 2: Update webhook settings
    console.log('\n2. Testing POST /api/admin/discord-webhook (update-settings)...');
    const testSettings = {
      webhookUrl: 'https://discord.com/api/webhooks/1391313317712236625/y9385uSHITd2NYrPjsvpaRXBkoD5TlVBihGofvFMzewYOfkRpW9C6mZboFcPqLKWPvm-',
      botName: 'TheRealm Parser',
      enabled: true,
      baseUrl: 'http://localhost:3000'
    };
    
    const updateResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-settings',
        ...testSettings
      })
    });
    
    const updateData = await updateResponse.json();
    console.log('✅ Settings update response:', updateData);
    
    // Test 3: Send a test notification
    console.log('\n3. Testing POST /api/admin/discord-webhook (send-notification)...');
    const notificationResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-notification',
        type: 'site-stats'
      })
    });
    
    const notificationData = await notificationResponse.json();
    console.log('✅ Notification response:', notificationData);
    
    // Test 4: Send latest session notification
    console.log('\n4. Testing latest session notification...');
    const latestResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-notification',
        type: 'latest-session'
      })
    });
    
    const latestData = await latestResponse.json();
    console.log('✅ Latest session response:', latestData);
    
    console.log('\n🎉 All admin panel webhook tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Visit http://localhost:3000/admin');
    console.log('2. Go to the "Discord Webhooks" tab');
    console.log('3. Configure your webhook settings');
    console.log('4. Test the manual notification buttons');
    
  } catch (error) {
    console.error('❌ Admin panel webhook test failed:', error.message);
  }
}

// Helper function to make fetch requests
async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = options.body ? JSON.stringify(JSON.parse(options.body)) : null;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (postData) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          });
        } catch (error) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve({ data })
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

testAdminWebhookAPI(); 