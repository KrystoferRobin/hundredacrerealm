"use client";
import { useState, useEffect } from 'react';

interface Player {
  name: string;
  totalGames: number;
  totalScore: number;
  bestScore: number;
  averageScore: number;
  charactersPlayed: string[];
  mostPlayedCharacter: string;
  mostPlayedCharacterCount: number;
  bestSessionId?: string;
  bestSessionTitle?: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        if (!response.ok) {
          throw new Error('Failed to fetch players');
        }
        const data = await response.json();
        setPlayers(data.players || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Players...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Error Loading Players</div>
          <div className="text-[#6b3e26] font-serif">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] font-serif">
      {/* Header */}
      <div className="bg-[#6b3e26] text-[#f6ecd6] py-6 shadow-lg border-b-4 border-[#bfa76a] relative">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#bfa76a] via-[#fff8e1] to-[#bfa76a]"></div>
        
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide drop-shadow-lg font-serif text-[#fff8e1] relative text-center">
            <span className="relative z-10">Players of the Hundred Acre Realm</span>
            <div className="absolute inset-0 bg-[#bfa76a] opacity-20 blur-sm rounded-lg"></div>
          </h1>
          <p className="text-sm text-[#bfa76a] mt-2 font-serif italic text-center">
            The brave adventurers who have ventured into the realm
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {players.length === 0 ? (
          <div className="text-center text-[#4b3a1e] font-serif italic">
            No player data available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <div key={player.name} className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative overflow-hidden group"
                   style={{
                     boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                   }}>
                {/* Decorative corner elements */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
                
                {/* Player Name */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-[#bfa76a] rounded-full flex items-center justify-center text-[#6b3e26] font-bold text-2xl mx-auto mb-2">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-[#6b3e26] font-serif">
                    {player.name}
                  </h3>
                </div>

                {/* Player Stats */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Games Played</p>
                      <p className="text-[#4b3a1e] font-serif font-bold">{player.totalGames}</p>
                    </div>
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Best Score</p>
                      <p className={`font-serif font-bold ${
                        typeof player.bestScore === 'number' 
                          ? player.bestScore < 0 
                            ? 'text-red-600' 
                            : player.bestScore > 0 
                              ? 'text-green-600' 
                              : 'text-black'
                          : 'text-black'
                      }`}>
                        {player.bestScore}
                      </p>
                    </div>
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Average Score</p>
                      <p className={`font-serif font-bold ${
                        typeof player.averageScore === 'number' 
                          ? player.averageScore < 0 
                            ? 'text-red-600' 
                            : player.averageScore > 0 
                              ? 'text-green-600' 
                              : 'text-black'
                          : 'text-black'
                      }`}>
                        {player.averageScore}
                      </p>
                    </div>
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Total Score</p>
                      <p className={`font-serif font-bold ${
                        typeof player.totalScore === 'number' 
                          ? player.totalScore < 0 
                            ? 'text-red-600' 
                            : player.totalScore > 0 
                              ? 'text-green-600' 
                              : 'text-black'
                          : 'text-black'
                      }`}>
                        {player.totalScore}
                      </p>
                    </div>
                  </div>

                  {/* Most Played Character */}
                  <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                    <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Most Played Character</p>
                    <p className="text-[#4b3a1e] font-serif">
                      {player.mostPlayedCharacter} ({player.mostPlayedCharacterCount} times)
                    </p>
                  </div>

                  {/* Characters Played */}
                  {player.charactersPlayed.length > 0 && (
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Characters Played</p>
                      <div className="flex flex-wrap gap-1">
                        {player.charactersPlayed.slice(0, 5).map((character, index) => (
                          <span key={index} className="text-xs bg-[#bfa76a] text-[#6b3e26] px-2 py-1 rounded">
                            {character}
                          </span>
                        ))}
                        {player.charactersPlayed.length > 5 && (
                          <span className="text-xs text-[#6b3e26] font-serif">
                            +{player.charactersPlayed.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 