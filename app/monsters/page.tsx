"use client";
import { useState, useEffect } from 'react';

interface MonsterPart {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      monster: string;
      part: string;
    };
    light: {
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
    dark: {
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
  };
}

interface Monster {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      monster: string;
      vulnerability: string;
      fame: string;
      notoriety: string;
      base_price: string;
      armored?: string;
      box_num?: string;
    };
    light: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
    dark: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
  };
  parts: MonsterPart[];
}

interface MonsterGroup {
  name: string;
  count: number;
  monsters: Monster[];
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

  // Function to get chit color as CSS color
  const getChitColor = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'lightorange': '#FFB366',
      'red': '#FF4444',
      'blue': '#4444FF',
      'green': '#44FF44',
      'yellow': '#FFFF44',
      'purple': '#FF44FF',
      'brown': '#8B4513',
      'grey': '#888888',
      'white': '#FFFFFF',
      'black': '#000000',
      'lightgreen': '#90EE90',
      'forestgreen': '#228B22',
      'pink': '#FFB6C1',
      'lightblue': '#ADD8E6',
      'orange': '#FFA500',
    };
    return colorMap[colorName] || '#FFFFFF';
  };

  // Function to render a chit (for monster or part)
  const renderChit = (data: any, side: 'light' | 'dark', isArmored: boolean = false) => {
    const sideData = data.attributeBlocks[side];
    if (!sideData) return null;
    const thisData = data.attributeBlocks.this;
    const backgroundColor = getChitColor(sideData.chit_color);
    
    // Check if strength and attack_speed are valid
    const hasValidStrength = sideData.strength && sideData.strength !== 'undefined';
    const hasValidAttackSpeed = sideData.attack_speed && sideData.attack_speed !== 'undefined';
    const hasValidMoveSpeed = sideData.move_speed && sideData.move_speed !== 'undefined';
    
    // Use skull for RED strength
    const strength = sideData.strength === 'RED' ? '💀' : sideData.strength;
    const combined = `${strength}${sideData.attack_speed}`;
    
    return (
      <div 
        key={`${data.id}-${side}`}
        className="relative w-18 h-18 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1"
        style={{ backgroundColor }}
      >
        {/* Fame (upper left, black text on magenta square) */}
        <div className="absolute top-0 left-0">
          <div className="bg-[#FF00FF] text-black text-xs font-bold px-1 rounded">
            {thisData.fame}
          </div>
        </div>
        {/* Notoriety (upper right, black text on light blue square) */}
        <div className="absolute top-0 right-0">
          <div className="bg-[#87CEEB] text-black text-xs font-bold px-1 rounded">
            {thisData.notoriety}
          </div>
        </div>
        {/* Base price (middle left, black text on gold circle) */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-xs font-bold text-black">
            {thisData.base_price}
          </div>
        </div>
        {/* Vulnerability (bottom left, black text on white square, or white text on dark grey if armored) */}
        <div className="absolute bottom-0 left-0">
          {isArmored ? (
            <div className="bg-[#444444] text-white text-xs font-bold px-1 rounded">
              {thisData.vulnerability}
            </div>
          ) : (
            <div className="bg-white text-black text-xs font-bold px-1 rounded">
              {thisData.vulnerability}
            </div>
          )}
        </div>
        {/* Combined Strength + Attack speed (bottom center, black text on red square) - only if both values are valid */}
        {hasValidStrength && hasValidAttackSpeed && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
            <div className="bg-[#FF0000] text-black text-xs font-bold px-1 rounded">
              {combined}
            </div>
          </div>
        )}
        {/* Move speed (bottom right, black text on green square) - only if value is valid */}
        {hasValidMoveSpeed && (
          <div className="absolute bottom-0 right-0">
            <div className="bg-[#00FF00] text-black text-xs font-bold px-1 rounded">
              {sideData.move_speed}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render a monster group panel
  const renderMonsterGroupPanel = (group: MonsterGroup) => {
    // Use the first monster as the representative
    const monster = group.monsters[0];
    const isArmored = monster.attributeBlocks.this.armored !== undefined;
    return (
      <div key={group.name} className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative overflow-hidden group"
           style={{
             boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
           }}>
        {/* Decorative corner elements */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
        {/* Monster Name and Count */}
        <h3 className="text-xl font-bold mb-4 text-[#6b3e26] font-serif text-center">
          {group.name} {group.count > 1 && <span className="text-base font-normal">x{group.count}</span>}
        </h3>
        {/* Light and Dark chits side by side */}
        <div className="flex justify-center space-x-4 mb-2">
          {renderChit(monster, 'light', isArmored)}
          {renderChit(monster, 'dark', isArmored)}
        </div>
        {/* Monster Parts (e.g., Head, Weapon) */}
        {monster.parts && monster.parts.length > 0 && (
          <div className="flex justify-center space-x-4 mt-2">
            {monster.parts.map(part => (
              <div key={part.id} className="flex flex-col items-center">
                <span className="text-xs text-[#6b3e26] font-serif mb-1">{part.name}</span>
                <div className="flex space-x-2">
                  {renderChit(part, 'light')}
                  {renderChit(part, 'dark')}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Monsters...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
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
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{minHeight: '100vh'}}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          {/* Monsters Grid - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {monsterGroups.map(renderMonsterGroupPanel)}
          </div>

          {/* Summary */}
          <div className="text-center mt-8">
            <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-4 inline-block">
              <p className="text-[#6b3e26] font-serif">
                <span className="font-bold">{monsterGroups.reduce((sum, g) => sum + g.count, 0)}</span> monsters available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 