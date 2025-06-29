'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Action {
  performer: string;
  action: string;
}

interface CombatRound {
  round: number;
  phase: string | null;
  actions: Action[];
  attacks: string[];
  damage: string[];
  armorDestruction: string[];
  deaths: string[];
  fameGains: Action[];
  spellCasting: Action[];
  fatigue: Action[];
  disengagement: Action[];
}

interface Combat {
  location: string;
  groups: any[];
  rounds: CombatRound[];
  participants: string[];
}

interface CharacterTurn {
  character: string;
  startLocation: string;
  actions: Array<{
    action: string;
    result: string;
  }>;
  endLocation: string;
  player: string;
}

interface DayData {
  monsterDieRoll: number | null;
  characterTurns: CharacterTurn[];
  battles: Combat[];
  monsterSpawns: any[];
  monsterBlocks: any[];
}

interface SessionData {
  sessionName: string;
  players: {
    [key: string]: {
      name: string;
      characters: string[];
    };
  };
  characterToPlayer: {
    [key: string]: string;
  };
  days: {
    [key: string]: DayData;
  };
}

interface Item {
  id: string;
  name: string;
  attributeBlocks: Record<string, any>;
  parts: any[];
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemCache, setItemCache] = useState<Record<string, Item>>({});

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Function to fetch item data
  const fetchItem = async (itemName: string): Promise<Item | null> => {
    if (itemCache[itemName]) {
      return itemCache[itemName];
    }

    try {
      const response = await fetch(`/api/items/${encodeURIComponent(itemName)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const item = data.item;
      
      setItemCache(prev => ({ ...prev, [itemName]: item }));
      return item;
    } catch (error) {
      console.error(`Failed to fetch item ${itemName}:`, error);
      return null;
    }
  };

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
      'gray': '#888888',
      'white': '#FFFFFF',
      'black': '#000000',
      'lightgreen': '#90EE90',
      'forestgreen': '#228B22'
    };
    return colorMap[colorName] || '#FFFFFF';
  };

  // Function to render armor chit
  const renderArmorChit = (item: Item, side: 'intact' | 'damaged') => {
    const sideData = item.attributeBlocks[side];
    const thisData = item.attributeBlocks.this;
    const backgroundColor = getChitColor(sideData.chit_color);

    return (
      <div 
        key={`${item.id}-${side}`}
        className="relative w-16 h-16 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1"
        style={{ backgroundColor }}
      >
        {/* Vulnerability (upper left, black text on white square) */}
        <div className="absolute top-0 left-0">
          <div className="bg-white text-black text-xs font-bold px-1 rounded">
            {thisData.vulnerability}
          </div>
        </div>
        
        {/* Weight (upper right, black text on yellow square) */}
        <div className="absolute top-0 right-0">
          <div className="bg-[#FFFF44] text-black text-xs font-bold px-1 rounded">
            {thisData.weight}
          </div>
        </div>
        
        {/* Base price (bottom center, black text on gold square) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#FFD700] text-black text-xs font-bold px-1 rounded">
            {sideData.base_price}
          </div>
        </div>
      </div>
    );
  };

  // Function to render weapon chit
  const renderWeaponChit = (item: Item, side: 'unalerted' | 'alerted') => {
    const sideData = item.attributeBlocks[side];
    const thisData = item.attributeBlocks.this;
    const backgroundColor = getChitColor(sideData.chit_color);

    return (
      <div 
        key={`${item.id}-${side}`}
        className="relative w-16 h-16 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1"
        style={{ backgroundColor }}
      >
        {/* Weight (upper left, black text on yellow square) */}
        <div className="absolute top-0 left-0">
          <div className="bg-[#FFFF44] text-black text-xs font-bold px-1 rounded">
            {thisData.weight}
          </div>
        </div>
        
        {/* Length (upper right, black text on blue square) */}
        <div className="absolute top-0 right-0">
          <div className="bg-[#4444FF] text-white text-xs font-bold px-1 rounded">
            {thisData.length}
          </div>
        </div>
        
        {/* Attack speed (bottom left, black text on green square) */}
        <div className="absolute bottom-0 left-0">
          <div className="bg-[#44FF44] text-black text-xs font-bold px-1 rounded">
            {sideData.attack_speed}
          </div>
        </div>
        
        {/* Strength (bottom center, black text on red square) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#FF0000] text-black text-xs font-bold px-1 rounded">
            {sideData.strength}
          </div>
        </div>
        
        {/* Sharpness (bottom right, black text on purple square) */}
        <div className="absolute bottom-0 right-0">
          <div className="bg-[#FF44FF] text-black text-xs font-bold px-1 rounded">
            {sideData.sharpness}
          </div>
        </div>
      </div>
    );
  };

  // Function to render treasure chit (single side)
  const renderTreasureChit = (item: Item) => {
    const thisData = item.attributeBlocks.this;
    const backgroundColor = getChitColor(thisData.chit_color || 'white');
    const isGreat = item.name.toLowerCase().includes('great');
    const isLarge = item.name.toLowerCase().includes('large');

    return (
      <div 
        className={`relative w-16 h-16 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1 ${
          isGreat ? 'shadow-lg shadow-yellow-400' : ''
        }`}
        style={{ 
          backgroundColor: isLarge ? '#FFD700' : backgroundColor 
        }}
      >
        {/* Base price (center, black text on gold square) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-[#FFD700] text-black text-xs font-bold px-1 rounded">
            {thisData.base_price || '?'}
          </div>
        </div>
      </div>
    );
  };

  // Function to render equipment tooltip
  const renderEquipmentTooltip = (itemName: string) => {
    const item = itemCache[itemName];
    if (!item) return null;

    const isArmor = item.attributeBlocks.intact && item.attributeBlocks.damaged;
    const isWeapon = item.attributeBlocks.unalerted && item.attributeBlocks.alerted;
    const isTreasure = !isArmor && !isWeapon;

    return (
      <div className="absolute z-50 bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-48">
        <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2">{item.name}</div>
        
        {isArmor && (
          <div className="space-y-2">
            <div className="text-xs text-[#6b3e26] font-serif">Armor Sides:</div>
            <div className="flex justify-center space-x-2">
              {renderArmorChit(item, 'intact')}
              {renderArmorChit(item, 'damaged')}
            </div>
          </div>
        )}
        
        {isWeapon && (
          <div className="space-y-2">
            <div className="text-xs text-[#6b3e26] font-serif">Weapon Sides:</div>
            <div className="flex justify-center space-x-2">
              {renderWeaponChit(item, 'unalerted')}
              {renderWeaponChit(item, 'alerted')}
            </div>
          </div>
        )}
        
        {isTreasure && (
          <div className="space-y-2">
            <div className="text-xs text-[#6b3e26] font-serif">Treasure:</div>
            <div className="flex justify-center">
              {renderTreasureChit(item)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render text with item tooltips
  const renderTextWithItems = (text: string) => {
    // Common item names to look for
    const itemNames = [
      // Weapons
      'Broadsword', 'Short Sword', 'Thrusting Sword', 'Great Sword', 'Axe', 'Great Axe', 
      'Spear', 'Mace', 'Morning Star', 'Staff', 'Crossbow', 'Light Bow', 'Medium Bow', 'Halberd',
      // Armor
      'Helmet', 'Breastplate', 'Shield', 'Armor', 'Cap', 'Cloak', 'Cuirass', 'Buckler',
      // Treasures
      'Gold', 'Silver', 'Jewel', 'Gem', 'Ring', 'Amulet', 'Crown', 'Scepter', 'Chalice',
      'Great', 'Large' // These will be combined with other words
    ];

    // Create a regex pattern to match item names
    const itemPattern = new RegExp(`\\b(${itemNames.join('|')})\\b`, 'gi');
    
    const parts = text.split(itemPattern);
    
    return parts.map((part, index) => {
      if (itemNames.some(name => name.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={index} className="relative group">
            <span 
              className="text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
              onMouseEnter={() => fetchItem(part)}
            >
              {part}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              {renderEquipmentTooltip(part)}
            </div>
          </span>
        );
      }
      return part;
    });
  };

  // Calculate statistics from the data
  const calculateStatistics = (data: SessionData) => {
    let totalCharacterTurns = 0;
    let totalBattles = 0;
    let totalActions = 0;
    const uniqueCharacters = new Set<string>();

    Object.values(data.days).forEach(dayData => {
      totalCharacterTurns += dayData.characterTurns.length;
      totalBattles += dayData.battles.length;
      
      dayData.characterTurns.forEach(turn => {
        // Only count actual characters, not natives (HQ characters)
        if (!turn.character.includes('HQ')) {
          uniqueCharacters.add(turn.character);
        }
        totalActions += turn.actions.length;
      });
    });

    return {
      totalCharacterTurns,
      totalBattles,
      totalActions,
      uniqueCharacters: uniqueCharacters.size,
      players: Object.keys(data.players).length
    };
  };

  // Filter out empty days and get sorted days
  const getFilteredDays = (data: SessionData) => {
    return Object.entries(data.days)
      .filter(([dayKey, dayData]) => {
        // Remove days with no character turns, no battles, and no monster spawns
        return dayData.characterTurns.length > 0 || 
               dayData.battles.length > 0 || 
               dayData.monsterSpawns.length > 0;
      })
      .sort(([a], [b]) => a.localeCompare(b));
  };

  const addSkulls = (text: string) => {
    return text.replace(/([^☠]*?)(was killed!?)/g, '☠ $1 ☠');
  };

  const formatAction = (action: Action) => {
    const formattedAction = addSkulls(action.action);
    return (
      <div key={`${action.performer}-${action.action}`} className="mb-1">
        <span className="font-semibold text-amber-600">{action.performer}:</span>{' '}
        <span className="text-gray-700">{renderTextWithItems(formattedAction)}</span>
      </div>
    );
  };

  const renderCombatRound = (round: CombatRound) => {
    const hasContent = round.actions.length > 0 || round.attacks.length > 0 || 
                      round.damage.length > 0 || round.deaths.length > 0 ||
                      round.fameGains.length > 0 || round.spellCasting.length > 0 ||
                      round.fatigue.length > 0 || round.disengagement.length > 0;

    if (!hasContent) return null;

    return (
      <div key={round.round} className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
        <h4 className="font-bold text-amber-800 mb-2">Round {round.round}</h4>
        
        {round.actions.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-amber-700 mb-1">Actions:</h5>
            {round.actions.map(formatAction)}
          </div>
        )}

        {round.attacks.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-amber-700 mb-1">Attacks:</h5>
            {round.attacks.map((attack, index) => (
              <div key={index} className="text-sm text-gray-600 mb-1">{renderTextWithItems(attack)}</div>
            ))}
          </div>
        )}

        {round.damage.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-red-700 mb-1">Damage:</h5>
            {round.damage.map((damage, index) => (
              <div key={index} className="text-sm text-red-600 mb-1">{renderTextWithItems(addSkulls(damage))}</div>
            ))}
          </div>
        )}

        {round.armorDestruction.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-orange-700 mb-1">Armor:</h5>
            {round.armorDestruction.map((armor, index) => (
              <div key={index} className="text-sm text-orange-600 mb-1">{renderTextWithItems(armor)}</div>
            ))}
          </div>
        )}

        {round.deaths.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-red-800 mb-1">Deaths:</h5>
            {round.deaths.map((death, index) => (
              <div key={index} className="text-sm text-red-700 mb-1 font-bold">{addSkulls(death)}</div>
            ))}
          </div>
        )}

        {round.fameGains.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-green-700 mb-1">Fame & Notoriety:</h5>
            {round.fameGains.map(formatAction)}
          </div>
        )}

        {round.spellCasting.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-purple-700 mb-1">Spells:</h5>
            {round.spellCasting.map(formatAction)}
          </div>
        )}

        {round.fatigue.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-blue-700 mb-1">Fatigue:</h5>
            {round.fatigue.map(formatAction)}
          </div>
        )}

        {round.disengagement.length > 0 && (
          <div className="mb-3">
            <h5 className="font-semibold text-gray-700 mb-1">Disengagement:</h5>
            {round.disengagement.map(formatAction)}
          </div>
        )}
      </div>
    );
  };

  const renderCombat = (combat: Combat, combatIndex: number) => {
    const meaningfulRounds = combat.rounds.filter(round => {
      return round.actions.length > 0 || round.attacks.length > 0 || 
             round.damage.length > 0 || round.deaths.length > 0 ||
             round.fameGains.length > 0 || round.spellCasting.length > 0 ||
             round.fatigue.length > 0 || round.disengagement.length > 0;
    });

    if (meaningfulRounds.length === 0) return null;

    return (
      <div key={`${combat.location}-${combatIndex}`} className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <h3 className="text-lg font-bold text-red-800 mb-3">
          ⚔️ Battle at {combat.location}
        </h3>
        {combat.participants.length > 0 && (
          <div className="mb-3 text-sm text-red-700">
            <span className="font-semibold">Participants:</span> {combat.participants.join(', ')}
          </div>
        )}
        {meaningfulRounds.map(renderCombatRound)}
      </div>
    );
  };

  const renderDay = (dayKey: string, dayData: DayData) => {
    const dayNumber = dayKey.replace('day_', '').replace('.txt', '');
    const [month, day] = dayNumber.split('_');
    
    return (
      <div key={dayKey} className="mb-8 p-6 bg-white border-2 border-amber-300 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-amber-800 mb-4">
          Month {month}, Day {day}
          {dayData.monsterDieRoll && (
            <span className="ml-4 text-lg text-gray-600">
              🎲 Monster Die: {dayData.monsterDieRoll}
            </span>
          )}
        </h2>

        {/* Character Turns */}
        {dayData.characterTurns.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-amber-700 mb-3">👥 Character Actions</h3>
            {dayData.characterTurns.map((turn, index) => (
              <div key={index} className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <h4 className="font-bold text-amber-800 mb-2">
                  {turn.character} ({turn.player})
                </h4>
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Start:</span> {turn.startLocation} | 
                  <span className="font-semibold ml-2">End:</span> {turn.endLocation}
                </div>
                {turn.actions.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-amber-700 mb-1">Actions:</h5>
                    {turn.actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">{renderTextWithItems(action.action)}</span>
                        {action.result && (
                          <span className="text-gray-500"> - {renderTextWithItems(action.result)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Monster Spawns */}
        {dayData.monsterSpawns.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">🐉 Monster Spawns:</h4>
            {dayData.monsterSpawns.map((spawn, index) => (
              <div key={index} className="text-sm text-gray-600">
                {spawn.monster} → {spawn.location}
              </div>
            ))}
          </div>
        )}

        {/* Combat */}
        {dayData.battles.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-red-700 mb-3">⚔️ Combat</h3>
            {dayData.battles.map((combat, index) => renderCombat(combat, index))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-2xl text-amber-800">Loading session data...</div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-2xl text-amber-800">Session not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Session Overview */}
        <div className="mb-8 p-6 bg-white border-2 border-amber-300 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-amber-800 mb-4">📊 Session Overview</h2>
          
          {/* Player Info */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-amber-700 mb-2">👤 Players</h3>
            {Object.entries(sessionData.players).map(([player, info]) => (
              <div key={player} className="mb-2">
                <span className="font-semibold text-amber-600">{player}:</span>{' '}
                <span className="text-gray-700">{info.characters.join(', ')}</span>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-amber-100 rounded">
              <div className="text-2xl font-bold text-amber-800">{calculateStatistics(sessionData).totalCharacterTurns}</div>
              <div className="text-sm text-amber-600">Character Turns</div>
            </div>
            <div className="text-center p-3 bg-red-100 rounded">
              <div className="text-2xl font-bold text-red-800">{calculateStatistics(sessionData).totalBattles}</div>
              <div className="text-sm text-red-600">Battles</div>
            </div>
            <div className="text-center p-3 bg-blue-100 rounded">
              <div className="text-2xl font-bold text-blue-800">{calculateStatistics(sessionData).totalActions}</div>
              <div className="text-sm text-blue-600">Actions</div>
            </div>
            <div className="text-center p-3 bg-green-100 rounded">
              <div className="text-2xl font-bold text-green-800">{calculateStatistics(sessionData).uniqueCharacters}</div>
              <div className="text-sm text-green-600">Characters</div>
            </div>
          </div>
        </div>

        {/* Days */}
        <div>
          <h2 className="text-2xl font-bold text-amber-800 mb-6">Game Days</h2>
          {getFilteredDays(sessionData).map(([dayKey, dayData]) => renderDay(dayKey, dayData))}
        </div>
      </div>
    </div>
  );
} 