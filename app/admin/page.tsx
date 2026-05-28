'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiscordWebhookPanel from '../../components/DiscordWebhookPanel';
import DataManagementPanel from '../../components/DataManagementPanel';
import CharacterAssignmentPanel from '../../components/CharacterAssignmentPanel';

interface Session {
  sessionId: string;
  name: string;
  date: string;
  players: number;
  lastModified: string;
}

interface User {
  username: string;
  isAdmin: boolean;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sessions');
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
    if (isLoggedIn) {
      loadSessions();
    }
  }, [isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth/status');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsLoggedIn(true);
        setUsername('');
        setPassword('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionId}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadSessions();
      } else {
        setError('Failed to delete session');
      }
    } catch (error) {
      setError('Failed to delete session');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to access admin features
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">
                Welcome, {user?.username}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Site
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upload Files
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Management
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'characters'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Character Assignments
            </button>
            <button
              onClick={() => setActiveTab('parsers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parsers'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Parsers
            </button>
            <button
              onClick={() => setActiveTab('discord')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'discord'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Discord Webhooks
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'sessions' && (
            <SessionsTab
              sessions={sessions}
              onDelete={handleSessionDelete}
              onRefresh={loadSessions}
            />
          )}
          {activeTab === 'upload' && (
            <UploadTab onUploadComplete={loadSessions} />
          )}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'data' && <DataManagementPanel />}
          {activeTab === 'characters' && <CharacterAssignmentPanel />}
          {activeTab === 'parsers' && <ParsersTab />}
          {activeTab === 'discord' && <DiscordWebhookPanel />}
        </div>
      </div>
    </div>
  );
}

function SessionsTab({ 
  sessions, 
  onDelete, 
  onRefresh 
}: { 
  sessions: Session[]; 
  onDelete: (id: string) => void; 
  onRefresh: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Session Management</h2>
        <button
          onClick={onRefresh}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {session.name}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {session.players} players
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Date: {session.date}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>Modified: {new Date(session.lastModified).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => onDelete(session.sessionId)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No sessions found
          </div>
        )}
      </div>
    </div>
  );
}

function UploadTab({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadStatus('Uploading files...');
    setUploadProgress({});

    const results: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: 'Uploading...'
      }));

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          results.push(`${fileName} → ${result.filename}`);
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: '✓ Success'
          }));
        } else {
          const error = await response.json();
          errors.push(`${fileName}: ${error.error}`);
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: '✗ Failed'
          }));
        }
      } catch (error) {
        errors.push(`${fileName}: Upload failed`);
        setUploadProgress(prev => ({
          ...prev,
          [fileName]: '✗ Failed'
        }));
      }
    }

    // Set final status
    if (results.length > 0 && errors.length === 0) {
      setUploadStatus(`All ${results.length} files uploaded successfully!`);
    } else if (results.length > 0 && errors.length > 0) {
      setUploadStatus(`${results.length} files uploaded, ${errors.length} failed`);
    } else {
      setUploadStatus('All uploads failed');
    }

    setUploading(false);
    onUploadComplete();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Files</h2>
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="max-w-xl">
            <label className="block text-sm font-medium text-gray-700">
              Game Files (.rsgame, .rslog)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".rsgame,.rslog"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">RSGAME or RSLOG files (multiple files supported)</p>
              </div>
            </div>
          </div>
          
          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Progress:</h4>
              <div className="space-y-1">
                {Object.entries(uploadProgress).map(([fileName, status]) => (
                  <div key={fileName} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate">{fileName}</span>
                    <span className={`ml-2 ${
                      status === '✓ Success' ? 'text-green-600' : 
                      status === '✗ Failed' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-md ${
              uploadStatus.includes('failed') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername || undefined,
          newPassword,
        }),
      });

      if (response.ok) {
        setMessage('Credentials updated successfully! Please log in again.');
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update credentials');
      }
    } catch (error) {
      setMessage('Failed to update credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Update Admin Credentials
          </h3>
          
          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="new-username" className="block text-sm font-medium text-gray-700">
                New Username (optional)
              </label>
              <input
                type="text"
                id="new-username"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Leave blank to keep current username"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Credentials'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



function ParsersTab() {
  const [runningParser, setRunningParser] = useState<string | null>(null);
  const [parserOutput, setParserOutput] = useState<string>('');
  const [parserStatus, setParserStatus] = useState<{ [key: string]: string }>({});

  const parsers = [
    {
      id: 'build_master_stats',
      name: 'Build Master Stats',
      description: 'Rebuild master statistics from all parsed sessions',
      script: 'scripts/build_master_stats.js'
    },
    {
      id: 'generate_session_titles',
      name: 'Generate Session Titles',
      description: 'Generate fancy names for all sessions',
      script: 'scripts/generate_session_titles.js'
    },
    {
      id: 'process_all_sessions',
      name: 'Process All Sessions',
      description: 'Reprocess all uploaded sessions',
      script: 'scripts/process_all_sessions.js'
    },
    {
      id: 'reprocess_existing_sessions',
      name: 'Reprocess Existing Sessions',
      description: 'Add missing files to existing sessions (parsed_session.json, character_inventories.json, etc.)',
      script: 'scripts/reprocess_existing_sessions.js'
    },
    {
      id: 'add_scoring_to_all_sessions',
      name: 'Calculate Scoring',
      description: 'Calculate scoring for all characters in all sessions',
      script: 'scripts/add_scoring_to_all_sessions.js'
    },
    {
      id: 'extract_missing_data',
      name: 'Extract Missing Data',
      description: 'Extract missing data from sessions',
      script: 'scripts/extract_missing_data.js'
    }
  ];

  const runParser = async (parserId: string) => {
    setRunningParser(parserId);
    setParserStatus(prev => ({ ...prev, [parserId]: 'Running...' }));
    setParserOutput('');

    try {
      const response = await fetch('/api/admin/parsers/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parserId }),
      });

      if (response.ok) {
        const result = await response.json();
        setParserOutput(result.output || 'Parser completed successfully');
        setParserStatus(prev => ({ ...prev, [parserId]: '✓ Completed' }));
      } else {
        const error = await response.json();
        setParserOutput(`Error: ${error.error}`);
        setParserStatus(prev => ({ ...prev, [parserId]: '✗ Failed' }));
      }
    } catch (error) {
      setParserOutput('Failed to run parser. Please try again.');
      setParserStatus(prev => ({ ...prev, [parserId]: '✗ Failed' }));
    } finally {
      setRunningParser(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Parser Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parser List */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Available Parsers
            </h3>
            
            <div className="space-y-3">
              {parsers.map((parser) => (
                <div key={parser.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{parser.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{parser.description}</p>
                      {parserStatus[parser.id] && (
                        <p className={`text-xs mt-1 ${
                          parserStatus[parser.id] === '✓ Completed' ? 'text-green-600' :
                          parserStatus[parser.id] === '✗ Failed' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {parserStatus[parser.id]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => runParser(parser.id)}
                      disabled={runningParser !== null}
                      className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {runningParser === parser.id ? 'Running...' : 'Run'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output Display */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Parser Output
            </h3>
            
            {parserOutput ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                  {parserOutput}
                </pre>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No output yet. Run a parser to see results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 