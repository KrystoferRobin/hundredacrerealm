'use client';

import { useState, useEffect } from 'react';

interface GameSession {
  id: string;
  name: string;
  totalCharacterTurns: number;
  totalBattles: number;
  totalActions: number;
  uniqueCharacters: number;
  players: number;
  lastModified: string;
  mainTitle?: string;
  subtitle?: string;
}

export default function GameLogsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/game-sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-2xl text-amber-800">Loading game logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-amber-800 mb-8">Game Logs</h1>
        
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl text-amber-700">No game logs found</div>
            <div className="text-amber-600 mt-2">Upload .rslog files to see them here</div>
          </div>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white border-2 border-amber-300 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-800 mb-2">
                      {session.mainTitle && session.subtitle ? `${session.mainTitle} -OR- ${session.subtitle}` : session.mainTitle || session.name}
                    </h2>
                    <p className="text-amber-600">Last modified: {formatDate(session.lastModified)}</p>
                  </div>
                  <a
                    href={`/session/${session.id}`}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                  >
                    View
                  </a>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-amber-100 rounded">
                    <div className="text-xl font-bold text-amber-800">{session.totalCharacterTurns}</div>
                    <div className="text-sm text-amber-600">Turns</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 rounded">
                    <div className="text-xl font-bold text-red-800">{session.totalBattles}</div>
                    <div className="text-sm text-red-600">Battles</div>
                  </div>
                  <div className="text-center p-3 bg-blue-100 rounded">
                    <div className="text-xl font-bold text-blue-800">{session.totalActions}</div>
                    <div className="text-sm text-blue-600">Actions</div>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded">
                    <div className="text-xl font-bold text-green-800">{session.uniqueCharacters}</div>
                    <div className="text-sm text-green-600">Characters</div>
                  </div>
                  <div className="text-center p-3 bg-purple-100 rounded">
                    <div className="text-xl font-bold text-purple-800">{session.players}</div>
                    <div className="text-sm text-purple-600">Players</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 