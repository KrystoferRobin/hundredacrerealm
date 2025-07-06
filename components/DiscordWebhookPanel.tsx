'use client';

import { useState, useEffect } from 'react';

interface WebhookSettings {
  webhookUrl: string;
  botName: string;
  enabled: boolean;
  baseUrl: string;
}

interface Session {
  id: string;
  name: string;
  players: number;
  characters: number;
  totalBattles: number;
  totalActions: number;
  days: number;
  finalDay: string;
  playerList: string;
  highestCharacter: string | null;
  highestPlayer: string | null;
  highestScore: number;
}

interface DiscordWebhookPanelProps {
  className?: string;
}

export default function DiscordWebhookPanel({ className = '' }: DiscordWebhookPanelProps) {
  const [settings, setSettings] = useState<WebhookSettings>({
    webhookUrl: '',
    botName: 'TheRealm Parser',
    enabled: false,
    baseUrl: 'http://localhost:3000'
  });
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customTemplate, setCustomTemplate] = useState('');
  const [customPreview, setCustomPreview] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/discord-webhook');
      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
      }
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error loading webhook data:', error);
      setMessage('Error loading webhook settings');
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          ...settings
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Error saving settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (type: string, sessionId?: string, customTemplate?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-notification',
          type,
          sessionId,
          customTemplate
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Notification sent successfully!');
      } else {
        setMessage(`Error sending notification: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setMessage('Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-notification',
          type: 'latest-session'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Test notification sent! Check your Discord channel.');
      } else {
        setMessage(`Test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setMessage('Error testing webhook');
    } finally {
      setLoading(false);
    }
  };

  const updateCustomPreview = () => {
    if (selectedSession && customTemplate) {
      const session = sessions.find(s => s.id === selectedSession);
      if (session) {
        const preview = customTemplate
          .replace(/\{sessionName\}/g, session.name || 'Unknown Session')
          .replace(/\{finalDay\}/g, session.finalDay || 'Unknown')
          .replace(/\{totalBattles\}/g, session.totalBattles?.toString() || '0')
          .replace(/\{totalActions\}/g, session.totalActions?.toString() || '0')
          .replace(/\{characters\}/g, session.characters?.toString() || '0')
          .replace(/\{players\}/g, session.players?.toString() || '0')
          .replace(/\{playerList\}/g, session.playerList || 'Unknown')
          .replace(/\{highestCharacter\}/g, session.highestCharacter || 'Unknown')
          .replace(/\{highestPlayer\}/g, session.highestPlayer || 'Unknown')
          .replace(/\{highestScore\}/g, session.highestScore?.toString() || '0')
          .replace(/\{days\}/g, session.days?.toString() || '0');
        setCustomPreview(preview);
      }
    }
  };

  useEffect(() => {
    updateCustomPreview();
  }, [customTemplate, selectedSession]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Discord Webhook Management</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Settings Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Webhook Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discord Webhook URL
            </label>
            <input
              type="text"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bot Name
            </label>
            <input
              type="text"
              value={settings.botName}
              onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://your-domain.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
              Enable Discord notifications
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button
              onClick={testWebhook}
              disabled={loading || !settings.enabled || !settings.webhookUrl}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Webhook'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Triggers Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Manual Notifications</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => sendNotification('highest-scoring-game')}
            disabled={loading || !settings.enabled}
            className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-yellow-800">🏆 Highest Scoring Game</div>
            <div className="text-sm text-yellow-600">Announce the game with the highest score</div>
          </button>
          
          <button
            onClick={() => sendNotification('latest-session')}
            disabled={loading || !settings.enabled}
            className="p-4 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-green-800">📅 Latest Session</div>
            <div className="text-sm text-green-600">Announce the most recent game session</div>
          </button>
          
          <button
            onClick={() => sendNotification('site-stats')}
            disabled={loading || !settings.enabled}
            className="p-4 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-blue-800">📊 Site Statistics</div>
            <div className="text-sm text-blue-600">Show overall site statistics</div>
          </button>
          
          <button
            onClick={() => sendNotification('hall-of-fame')}
            disabled={loading || !settings.enabled}
            className="p-4 bg-orange-100 border border-orange-300 rounded-lg hover:bg-orange-200 disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-orange-800">🏆 Hall of Fame</div>
            <div className="text-sm text-orange-600">Show the best achievements across all games</div>
          </button>
          
          <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
            <div className="font-semibold text-gray-800 mb-2">🎮 Custom Session</div>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a session...</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.finalDay})
                </option>
              ))}
            </select>
            <button
              onClick={() => sendNotification('custom-session', selectedSession)}
              disabled={loading || !settings.enabled || !selectedSession}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Announce Selected Session
            </button>
          </div>
          
          <div className="p-4 bg-purple-100 border border-purple-300 rounded-lg">
            <div className="font-semibold text-purple-800 mb-2">✨ Custom Message Builder</div>
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              {showCustomizer ? 'Hide Customizer' : 'Show Customizer'}
            </button>
          </div>
        </div>
        
        {showCustomizer && (
          <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">✨ Custom Message Builder</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  Available Data Tags:
                </label>
                <div className="bg-white p-4 rounded-md border border-purple-200 text-sm">
                  <div className="grid grid-cols-1 gap-2">
                    <div><code className="bg-purple-100 px-1 rounded">{'{sessionName}'}</code> - Session title</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{finalDay}'}</code> - Final game day (e.g., 3m15d)</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{totalBattles}'}</code> - Total battles fought</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{totalActions}'}</code> - Total actions taken</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{characters}'}</code> - Number of characters</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{players}'}</code> - Number of players</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{playerList}'}</code> - List of all players</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{highestCharacter}'}</code> - Highest scoring character</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{highestPlayer}'}</code> - Player with highest score</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{highestScore}'}</code> - Highest score achieved</div>
                    <div><code className="bg-purple-100 px-1 rounded">{'{days}'}</code> - Total days played</div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  Custom Message Template:
                </label>
                <textarea
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  placeholder="Enter your custom message with data tags..."
                  className="w-full h-32 px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Preview (with selected session data):
                  </label>
                  <div className="bg-white p-3 rounded-md border border-purple-200 text-sm min-h-[60px]">
                    {customPreview || 'Select a session and enter a template to see preview...'}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="flex-1 px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select session for preview...</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} ({session.finalDay})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => sendNotification('custom-message', selectedSession, customTemplate)}
                    disabled={loading || !settings.enabled || !selectedSession || !customTemplate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    Send Custom Message
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                💡 <strong>Tip:</strong> Use Discord markdown in your template! 
                **Bold text**, *italic text*, `code blocks`, and [links](url) are supported.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Recent Sessions</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battles</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.slice(0, 10).map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{session.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{session.playerList}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{session.finalDay}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{session.totalBattles}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {session.highestCharacter} ({session.highestScore})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 