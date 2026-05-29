"use client";

import { useState, useEffect } from 'react';
import { MonsterChitToken } from '@/components/MonsterChitToken';
import type { MonsterRecord } from '@/lib/monster-token-image';

interface MonsterGroup {
  name: string;
  count: number;
  monsters: MonsterRecord[];
}

export default function MonstersPage() {
  const [monsterGroups, setMonsterGroups] = useState<MonsterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonsters = async () => {
      try {
        const response = await fetch('/api/monsters');
        if (!response.ok) {
          throw new Error('Failed to fetch monsters');
        }
        const data = await response.json();
        setMonsterGroups(data.monsterGroups || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monsters');
      } finally {
        setLoading(false);
      }
    };

    fetchMonsters();
  }, []);

  const renderMonsterGroupPanel = (group: MonsterGroup) => {
    const monster = group.monsters[0];
    return (
      <div
        key={group.name}
        className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative overflow-hidden group"
        style={{
          boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md" />
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md" />

        <h3 className="text-xl font-bold mb-4 text-[#6b3e26] font-serif text-center">
          {group.name}{' '}
          {group.count > 1 && <span className="text-base font-normal">x{group.count}</span>}
        </h3>

        <div className="flex justify-center gap-4 mb-2">
          <MonsterChitToken record={monster} side="light" />
          <MonsterChitToken record={monster} side="dark" />
        </div>

        {monster.parts && monster.parts.length > 0 && (
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {monster.parts.map((part) => (
              <div key={part.id} className="flex flex-col items-center">
                <span className="text-xs text-[#6b3e26] font-serif mb-1">{part.name}</span>
                <div className="flex gap-2">
                  <MonsterChitToken record={part} side="light" />
                  <MonsterChitToken record={part} side="dark" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Monsters...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Error Loading Monsters</div>
          <div className="text-[#6b3e26] font-serif">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{ minHeight: '100vh' }}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col px-4">
          <p className="text-center text-sm text-[#6b3e26] font-serif mt-4 mb-2 opacity-80">
            Alternative (Wesnoth) counter art — same portrait on light and dark sides
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
            {monsterGroups.map(renderMonsterGroupPanel)}
          </div>
          <div className="text-center mt-8 mb-6">
            <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-4 inline-block">
              <p className="text-[#6b3e26] font-serif">
                <span className="font-bold">{monsterGroups.reduce((sum, g) => sum + g.count, 0)}</span>{' '}
                monsters available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
