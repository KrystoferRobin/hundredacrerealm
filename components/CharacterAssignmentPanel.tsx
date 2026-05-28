'use client';

import React, { useState, useEffect } from 'react';

interface Character {
  characterName: string;
  playerName: string;
  score?: number;
  isDead?: boolean;
}

interface Session {
  sessionId: string;
  name: string;
  characters: Character[];
  date?: string;
  totalDays?: number;
}

interface CharacterAssignmentPanelProps {
  className?: string;
}

export default function CharacterAssignmentPanel({ className = '' }: CharacterAssignmentPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingCharacter, setEditingCharacter] = useState<{
    sessionId: string;
    characterName: string;
    currentPlayer: string;
  } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/character-assignments');
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
        // Expand all sessions by default
        setExpandedSessions(new Set(data.sessions.map((s: Session) => s.sessionId)));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setMessage('Error loading character assignments');
    } finally {
      setLoading(false);
    }
  };

  const updateCharacterAssignment = async (sessionId: string, characterName: string, newPlayerName: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/character-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          characterName,
          newPlayerName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        // Reload sessions to reflect changes
        await loadSessions();
        // Clear editing state
        setEditingCharacter(null);
        setNewPlayerName('');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating character assignment:', error);
      setMessage('Error updating character assignment');
    } finally {
      setSaving(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const startEditing = (sessionId: string, characterName: string, currentPlayer: string) => {
    setEditingCharacter({ sessionId, characterName, currentPlayer });
    setNewPlayerName(currentPlayer);
  };

  const cancelEditing = () => {
    setEditingCharacter(null);
    setNewPlayerName('');
  };

  const saveEdit = () => {
    if (editingCharacter && newPlayerName.trim()) {
      updateCharacterAssignment(
        editingCharacter.sessionId,
        editingCharacter.characterName,
        newPlayerName.trim()
      );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredSessions = sessions.filter(session => {
    const sessionMatches = session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          session.sessionId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (sessionMatches) return true;
    
    // Check if any character or player names match
    return session.characters.some(char => 
      char.characterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      char.playerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const groupedByPlayer = (characters: Character[]) => {
    const groups: { [playerName: string]: Character[] } = {};
    characters.forEach(char => {
      if (!groups[char.playerName]) {
        groups[char.playerName] = [];
      }
      groups[char.playerName].push(char);
    });
    return groups;
  };

  const getPlayerStats = (characters: Character[]) => {
    const totalCharacters = characters.length;
    const deadCharacters = characters.filter(c => c.isDead).length;
    const totalScore = characters.reduce((sum, c) => sum + (c.score || 0), 0);
    const averageScore = totalCharacters > 0 ? Math.round(totalScore / totalCharacters) : 0;
    const bestScore = Math.max(...characters.map(c => c.score || 0));
    
    return {
      totalCharacters,
      deadCharacters,
      totalScore,
      averageScore,
      bestScore
    };
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Character Assignment Management</h2>
        <p className="text-gray-600 mt-1">Reassign characters to different players across all sessions</p>
      </div>

      {message && (
        <div className={`mx-6 mt-4 p-3 rounded ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              placeholder="Search sessions, characters, or players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadSessions}
              disabled={loading}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Found {filteredSessions.length} sessions with {filteredSessions.reduce((sum, s) => sum + s.characters.length, 0)} character assignments
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading character assignments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const playerGroups = groupedByPlayer(session.characters);
              
              return (
                <div key={session.sessionId} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSession(session.sessionId)}
                    className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{session.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(session.date)} • {session.totalDays || 0} days • {session.characters.length} characters
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {Object.keys(playerGroups).length} players
                      </span>
                      <span className="text-gray-400">
                        {expandedSessions.has(session.sessionId) ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  
                  {expandedSessions.has(session.sessionId) && (
                    <div className="p-4 space-y-4">
                      {Object.entries(playerGroups).map(([playerName, characters]) => {
                        const stats = getPlayerStats(characters);
                        return (
                          <div key={playerName} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-gray-800">
                                👤 {playerName} ({characters.length} character{characters.length !== 1 ? 's' : ''})
                              </div>
                              <div className="text-sm text-gray-500">
                                {stats.deadCharacters > 0 && <span className="text-red-600 mr-2">☠️ {stats.deadCharacters} dead</span>}
                                <span>Avg: {stats.averageScore} pts</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {characters.map((character) => (
                                <div key={character.characterName} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {character.characterName}
                                      {character.isDead && <span className="ml-2 text-red-600">☠️</span>}
                                    </div>
                                    {character.score !== undefined && (
                                      <div className="text-sm text-gray-500">
                                        Score: {character.score} points
                                      </div>
                                    )}
                                  </div>
                                  
                                  {editingCharacter?.sessionId === session.sessionId && 
                                   editingCharacter?.characterName === character.characterName ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={newPlayerName}
                                        onChange={(e) => setNewPlayerName(e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                                        placeholder="New player name"
                                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                      />
                                      <button
                                        onClick={saveEdit}
                                        disabled={saving || !newPlayerName.trim()}
                                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                      >
                                        {saving ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={cancelEditing}
                                        className="px-2 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startEditing(session.sessionId, character.characterName, character.playerName)}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                      Reassign
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredSessions.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No sessions found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'No character assignments available'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 