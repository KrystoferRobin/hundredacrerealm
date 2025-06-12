"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  days: number;
  createdAt: string;
  characters: { id: string; name: string }[];
  players: { id: string; name: string }[];
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games');
        if (!response.ok) {
          throw new Error('Failed to fetch games');
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-black">All Games</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 text-left">Game Name</th>
            <th className="border p-2 text-left">Characters</th>
            <th className="border p-2 text-left">Players</th>
            <th className="border p-2 text-left">Days</th>
            <th className="border p-2 text-left">Upload Date</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border">
              <td className="border p-2">
                <Link href={`/games/${game.id}`} className="text-blue-600 hover:underline">
                  {game.name}
                </Link>
              </td>
              <td className="border p-2">
                {game.characters && game.characters.map((char, index) => (
                  <span key={char.id}>
                    <Link href={`/characters/${char.id}`} className="text-blue-600 hover:underline">
                      {char.name}
                    </Link>
                    {index < game.characters.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </td>
              <td className="border p-2">
                {game.players && game.players.map((player, index) => (
                  <span key={player.id}>
                    {player.name}
                    {index < game.players.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </td>
              <td className="border p-2">{game.days}</td>
              <td className="border p-2 text-sm italic">
                {new Date(game.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 