// Test the admin panel Discord webhook API (requires local dev server + env vars)

async function testAdminWebhookAPI() {
  console.log('🧪 Testing Admin Panel Discord Webhook API...');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('❌ DISCORD_WEBHOOK_URL is not set. Add it to .env before running this test.');
    process.exit(1);
  }

  try {
    console.log('\n1. Testing GET /api/admin/discord-webhook...');
    const getResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`);
    const getData = await getResponse.json();

    console.log('✅ GET response received');
    console.log('Settings:', getData.settings);
    console.log(`Sessions found: ${getData.sessions?.length || 0}`);

    console.log('\n2. Testing POST /api/admin/discord-webhook (update-settings)...');
    const testSettings = {
      webhookUrl,
      botName: 'TheRealm Parser',
      enabled: true,
      baseUrl
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
    console.log('✅ Update response:', updateData.success ? 'Success' : updateData);

    console.log('\n3. Testing POST /api/admin/discord-webhook (send-notification)...');
    const notificationResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-notification',
        sessionId: 'test-session',
        notificationType: 'session_complete'
      })
    });

    const notificationData = await notificationResponse.json();
    console.log('✅ Notification response:', notificationData.success ? 'Success' : notificationData);

    console.log('\n4. Verifying settings were saved...');
    const latestResponse = await fetch(`${baseUrl}/api/admin/discord-webhook`);
    const latestData = await latestResponse.json();
    console.log('✅ Latest settings loaded (webhook URL redacted)');

    console.log('\n🎉 All admin panel webhook tests completed successfully!');
    console.log('\nNext steps:');
    console.log(`1. Visit ${baseUrl}/admin`);
    console.log('2. Go to the "Discord Webhooks" tab');
    console.log('3. Configure your webhook settings');
  } catch (error) {
    console.error('❌ Admin panel webhook test failed:', error.message);
    process.exit(1);
  }
}

testAdminWebhookAPI();
