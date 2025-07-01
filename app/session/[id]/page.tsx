'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import SessionMap from '../../../components/SessionMap';

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
  const [sessionName, setSessionName] = useState<{ mainTitle: string; subtitle: string } | null>(null);
  const [characterInventories, setCharacterInventories] = useState<any>(null);
  const [deadCharacters, setDeadCharacters] = useState<Set<string>>(new Set());
  const [characterStats, setCharacterStats] = useState<any>(null);
  const [finalScores, setFinalScores] = useState<any>(null);
  const [scorePopover, setScorePopover] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      console.log('SessionPage: Fetching session data for:', sessionId);
      try {
        const response = await fetch(`/api/session/${sessionId}`);
        console.log('SessionPage: API response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('SessionPage: Session data loaded:', data);
          setSessionData(data);
          
          // Fetch session name from game-sessions API
          const nameResponse = await fetch('/api/game-sessions');
          if (nameResponse.ok) {
            const sessions = await nameResponse.json();
            const session = sessions.find((s: any) => s.id === sessionId);
            if (session && session.mainTitle) {
              setSessionName({
                mainTitle: session.mainTitle,
                subtitle: session.subtitle || ''
              });
            }
          }
        } else {
          console.error('SessionPage: Failed to load session data');
        }
      } catch (error) {
        console.error('SessionPage: Error fetching session data:', error);
      } finally {
        setLoading(false);
      }

      // Fetch character inventories
      try {
        const invRes = await fetch(`/api/session/${sessionId}/character-inventories`);
        if (invRes.ok) {
          const invData = await invRes.json();
          console.log('Loaded character inventories:', invData);
          setCharacterInventories(invData);
        } else {
          console.error('Failed to load character inventories, status:', invRes.status);
        }
      } catch (e) { 
        console.error('Failed to load character inventories:', e);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Extract dead characters for tombstone
  useEffect(() => {
    if (!sessionData) return;
    const dayKeys = Object.keys(sessionData.days);
    const sortedDayKeys = dayKeys.sort((a, b) => {
      const [am, ad] = a.split('_').map(Number);
      const [bm, bd] = b.split('_').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
    const dead = new Set<string>();
    for (const dayKey of sortedDayKeys) {
      const day = sessionData.days[dayKey];
      if (day && day.battles) {
        for (const battle of day.battles) {
          for (const round of battle.rounds) {
            for (const death of round.deaths) {
              const match = death.match(/^(.*?) was killed!/);
              if (match) {
                dead.add(match[1]);
              }
            }
          }
        }
      }
    }
    setDeadCharacters(dead);
  }, [sessionData]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/character-stats`);
        if (res.ok) {
          setCharacterStats(await res.json());
        }
      } catch (e) {
        setCharacterStats(null);
      }
    };
    fetchStats();
  }, [sessionId]);

  // Fetch final scores
  useEffect(() => {
    const fetchFinalScores = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/final-scores`);
        if (res.ok) {
          setFinalScores(await res.json());
        }
      } catch (e) {
        setFinalScores(null);
      }
    };
    if (sessionId) {
      fetchFinalScores();
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
    const isSpell = item.attributeBlocks.this?.spell;
    const isTreasure = !isArmor && !isWeapon && !isSpell;
    


    return (
      <div className="absolute z-50 bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-48">
        <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">{item.name}</div>
        
        {isSpell && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6b3e26] font-serif font-semibold">Level {item.attributeBlocks.this.spell}</span>
              <span className="text-[#6b3e26] font-serif capitalize">{item.attributeBlocks.this.duration}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6b3e26] font-serif capitalize">{item.attributeBlocks.this.magic_color || 'Any'}</span>
              <span className="text-[#6b3e26] font-serif capitalize">{item.attributeBlocks.this.target || 'Self'}</span>
            </div>
            <div className="border-t border-[#bfa76a] pt-2 mt-2">
              <div className="text-xs text-[#6b3e26] font-serif italic leading-relaxed">
                {item.attributeBlocks.this.text || 'No description available'}
              </div>
            </div>
          </div>
        )}
        
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

  // Function to get character icon path
  const getCharacterIconPath = (characterName: string) => {
    const iconName = characterName.replace(/\s+/g, ' ') + '_symbol.png';
    return `/images/charsymbol/${iconName}`;
  };

  // Function to render treasure bag icon
  const renderTreasureBagIcon = () => (
    <span className="inline-block w-4 h-4 mr-1" title="Treasure">
      💰
    </span>
  );

  // Function to render great treasure with golden bubble
  const renderGreatTreasure = (itemName: string) => (
    <span className="inline-block bg-yellow-400 text-black font-bold px-2 py-1 rounded-full text-xs mr-2 mb-1">
      {itemName.toUpperCase()}
    </span>
  );

  // Function to render native chit (simplified version)
  const renderNativeChit = (nativeName: string) => {
    return (
      <div className="inline-block relative w-12 h-12 border-2 border-[#6b3e26] rounded-md bg-white mr-2 mb-1">
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#6b3e26]">
          {nativeName.split(' ')[0]}
        </div>
      </div>
    );
  };

  // Function to render character box
  const renderCharacterBox = (characterName: string, playerName: string) => {
    const inventory = characterInventories?.[characterName]?.items;
    const isDead = deadCharacters.has(characterName);
    console.log(`Rendering ${characterName}:`, { inventory, characterInventories: characterInventories?.[characterName] });
    
    // Helper to flatten and filter
    const flat = (arr: any[]) => arr?.filter(Boolean) || [];
    
    // Helper function to create item elements with tooltips
    const createItemElement = (item: any, category: string, idx: number, arr: any[]) => {
      const isLast = idx === arr.length - 1;
      const comma = isLast ? '' : ', ';
      
      if (category === 'weapon' || category === 'armor') {
        return (
          <div key={`${category}-${idx}`} className="relative group inline-block">
            <span 
              className="text-sm text-gray-700 mr-2 mb-1 cursor-pointer hover:text-amber-600 transition-colors"
              onMouseEnter={() => fetchItem(item.name)}
            >
              {item.name}{comma}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </div>
        );
      } else if (category === 'treasure') {
        return (
          <div key={`${category}-${idx}`} className="relative group inline-block">
            <span 
              className="text-sm text-gray-700 mr-2 mb-1 cursor-pointer hover:text-amber-600 transition-colors"
              onMouseEnter={() => fetchItem(item.name)}
            >
              {renderTreasureBagIcon()}{item.name}{comma}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </div>
        );
      } else if (category === 'great_treasure') {
        return (
          <div key={`${category}-${idx}`} className="relative group inline-block">
            <span 
              className="mr-2 mb-1 cursor-pointer"
              onMouseEnter={() => fetchItem(item.name)}
            >
              {renderGreatTreasure(item.name)}{comma}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </div>
        );
      } else if (category === 'spell') {
        return (
          <div key={`${category}-${idx}`} className="relative group inline-block">
            <span 
              className="text-sm text-blue-700 mr-2 mb-1 cursor-pointer hover:text-blue-500 transition-colors"
              onMouseEnter={() => fetchItem(item.name)}
            >
              {item.name}{comma}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </div>
        );
      } else if (category === 'native') {
        return (
          <div key={`${category}-${idx}`} className="relative group inline-block">
            <span 
              className="mr-2 mb-1 cursor-pointer"
              onMouseEnter={() => fetchItem(item.name)}
            >
              {renderNativeChit(item.name)}{comma}
            </span>
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </div>
        );
      }
      return null;
    };
    
    // Helper function to remove duplicates by name
    const removeDuplicates = (items: any[]) => {
      const seen = new Set<string>();
      return items.filter(item => {
        if (seen.has(item.name)) {
          return false;
        }
        seen.add(item.name);
        return true;
      });
    };

    // Collect items by category and remove duplicates
    const weapons = removeDuplicates([...flat(inventory?.weapons), ...flat(inventory?.other).filter(item => item.category === 'weapon')]);
    const armor = removeDuplicates([...flat(inventory?.armor), ...flat(inventory?.other).filter(item => item.category === 'armor')]);
    const treasures = removeDuplicates([...flat(inventory?.treasures), ...flat(inventory?.other).filter(item => item.category === 'treasure')]);
    const greatTreasures = removeDuplicates([...flat(inventory?.great_treasures), ...flat(inventory?.other).filter(item => item.category === 'great_treasure')]);
    const natives = removeDuplicates([...flat(inventory?.natives), ...flat(inventory?.other).filter(item => item.category === 'native')]);
    const spells = removeDuplicates([...flat(inventory?.spells), ...flat(inventory?.other).filter(item => item.category === 'spell')]);
    
    // Create item lines
    const regularItems = [...weapons, ...armor].map((item, idx, arr) => createItemElement(item, item.category, idx, arr));
    const treasureItems = treasures.map((item, idx, arr) => createItemElement(item, 'treasure', idx, arr));
    const greatTreasureItems = greatTreasures.map((item, idx, arr) => createItemElement(item, 'great_treasure', idx, arr));
    const nativeItems = natives.map((item, idx, arr) => createItemElement(item, 'native', idx, arr));
    const spellItems = spells.map((item, idx, arr) => createItemElement(item, 'spell', idx, arr));
    
    // Calculate stats
    const stats = characterStats?.[characterName] || { gold: 0, fame: 0, notoriety: 0, startingSpells: 0 };
    // Great treasures
    const gtCount = greatTreasures.length;
    // Learned spells: total spells - starting spells
    const spellCount = spells.length;
    const learnedSpells = spellCount - (stats.startingSpells || 0);

    // Get final score and breakdown
    const scoreData = finalScores?.[characterName];
    let score = scoreData?.totalScore;
    if (isDead) {
      score = -100;
    }

    let scoreColor = 'text-black';
    if (typeof score === 'number') {
      if (score < 0) scoreColor = 'text-red-600';
      else if (score > 0) scoreColor = 'text-green-600';
    }

    // Popover content for score breakdown
    const popoverContent = isDead
      ? (
          <div className="bg-white border border-gray-300 rounded shadow-lg p-3 text-xs text-gray-900 z-50 min-w-[220px]">
            <div className="font-bold mb-1">Scoring Breakdown</div>
            <div className="text-xs text-gray-700">
              <div className="font-semibold text-red-600 mb-1">Character is Dead</div>
              <div>Automatic penalty: -100 points</div>
              {scoreData && (
                <div className="mt-2 text-gray-500 italic">Original calculated score: {scoreData.totalScore}</div>
              )}
            </div>
          </div>
        )
      : scoreData && scoreData.categories
        ? (
          <div className="bg-white border border-gray-300 rounded shadow-lg p-3 text-xs text-gray-900 z-50 min-w-[220px]">
            <div className="font-bold mb-1">Scoring Breakdown</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left">Cat</th>
                  <th>Actual</th>
                  <th>Need</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(scoreData.categories).map(([cat, d]: any) => (
                  <tr key={cat}>
                    <td className="pr-1 font-mono">{cat[0].toUpperCase()}</td>
                    <td className="text-right">{d.actual ?? 0}</td>
                    <td className="text-right">{d.required ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        : null;

    return (
      <div key={characterName} className="bg-white border-2 border-amber-300 rounded-lg p-4 mb-4 shadow-lg flex flex-row justify-between min-h-[200px]">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 mr-3 relative">
              <img
                src={getCharacterIconPath(characterName)}
                alt={`${characterName} icon`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center">
                <h4 className="text-lg font-bold text-amber-800 mr-2">{characterName}</h4>
                {isDead && (
                  <span title="Dead" className="ml-2 text-2xl">👻</span>
                )}
              </div>
              <p className="text-sm text-gray-600">({playerName})</p>
            </div>
          </div>
          
          {/* Items organized by category */}
          <div className="space-y-2">
            {/* Regular items (weapons/armor) */}
            {regularItems.length > 0 && (
              <div className="flex flex-wrap items-center">
                {regularItems}
              </div>
            )}
            
            {/* Treasures */}
            {treasureItems.length > 0 && (
              <div className="flex flex-wrap items-center">
                {treasureItems}
              </div>
            )}
            
            {/* Great Treasures */}
            {greatTreasureItems.length > 0 && (
              <div className="flex flex-wrap items-center">
                {greatTreasureItems}
              </div>
            )}
            
            {/* Natives */}
            {nativeItems.length > 0 && (
              <div className="flex flex-wrap items-center">
                {nativeItems}
              </div>
            )}
            
            {/* Spells (with extra spacing) */}
            {spellItems.length > 0 && (
              <>
                <div className="h-2"></div> {/* Extra spacing */}
                <div className="flex flex-wrap items-center">
                  {spellItems}
                </div>
              </>
            )}
            
            {/* No items message */}
            {regularItems.length === 0 && treasureItems.length === 0 && greatTreasureItems.length === 0 && nativeItems.length === 0 && spellItems.length === 0 && (
              <div className="flex flex-wrap items-center">
                <span className="text-sm text-gray-500 italic">No items found</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-start text-xs font-mono text-amber-900 space-y-1 ml-4 relative">
          <div><span className="font-bold">gt</span>: {gtCount}</div>
          <div><span className="font-bold">s</span>: {learnedSpells}</div>
          <div><span className="font-bold">f</span>: {stats.fame}</div>
          <div><span className="font-bold">n</span>: {stats.notoriety}</div>
          <div><span className="font-bold">g</span>: {stats.gold}</div>
          {/* Final Score positioned at bottom */}
          <div className="mt-auto pt-4">
            <div
              className={`text-base font-bold cursor-pointer ${scoreColor}`}
              onMouseEnter={() => setScorePopover(characterName)}
              onMouseLeave={() => setScorePopover(null)}
            >
              {typeof score === 'number' && `Score: ${score}`}
              {scorePopover === characterName && (
                <div className="absolute right-0 bottom-8 z-50">
                  {popoverContent}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Extract character icon overlay data
  const characterIcons = useMemo(() => {
    if (!sessionData) return [];
    // Find all unique characters
    const allCharacters = Object.keys(sessionData.characterToPlayer);
    // Find the latest day chronologically
    const dayKeys = Object.keys(sessionData.days);
    const sortedDayKeys = dayKeys.sort((a, b) => {
      const [am, ad] = a.split('_').map(Number);
      const [bm, bd] = b.split('_').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
    // Gather deaths from ALL days (not just the latest)
    const deadCharacters = new Set<string>();
    for (const dayKey of sortedDayKeys) {
      const day = sessionData.days[dayKey];
      if (day && day.battles) {
        for (const battle of day.battles) {
          for (const round of battle.rounds) {
            for (const death of round.deaths) {
              const match = death.match(/^(.*?) was killed!/);
              if (match) {
                deadCharacters.add(match[1]);
                console.log(`Found dead character: ${match[1]} on day ${dayKey}`);
              }
            }
          }
        }
      }
    }
    // For each character, find their last turn (latest day with a turn)
    const charLastLoc: Record<string, { tile: string, clearing: string }> = {};
    for (const dayKey of sortedDayKeys) {
      const day = sessionData.days[dayKey];
      for (const turn of day.characterTurns) {
        // Parse endLocation, e.g. "Borderland 4"
        const m = turn.endLocation.match(/^(.*?) (\d)$/);
        if (m) {
          charLastLoc[turn.character] = { tile: m[1], clearing: m[2] };
        }
      }
    }
    // Build icon array
    const result = allCharacters.map(character => {
      const loc = charLastLoc[character];
      const isDead = deadCharacters.has(character);
      console.log(`Character ${character}: location=${loc ? `${loc.tile} ${loc.clearing}` : 'unknown'}, dead=${isDead}`);
      return loc ? {
        character,
        tile: loc.tile,
        clearing: loc.clearing,
        isDead,
      } : null;
    }).filter((x): x is { character: string; tile: string; clearing: string; isDead: boolean } => Boolean(x));
    console.log('Final character icons:', result);
    return result;
  }, [sessionData]);

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
      {/* Session Overview - Full width to match columns below */}
      <div className="w-full px-6">
        <div className="mb-8 p-6 bg-white border-2 border-amber-300 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-amber-800 mb-4 text-center">
            {sessionName ? sessionName.mainTitle : '📊 Session Overview'}
            {sessionName?.subtitle && (
              <div className="text-lg text-amber-600 mt-2 font-normal">
                {sessionName.subtitle}
              </div>
            )}
          </h2>
          
          {/* Character Boxes */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-amber-700 mb-4">👥 Characters</h3>
            {(!characterStats || !characterInventories) ? (
              <div className="text-center py-8">
                <div className="text-lg text-amber-600">Loading character data...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(sessionData.players)
                  .flatMap(([player, info]) => 
                    info.characters.map(character => ({ character, player }))
                  )
                  .sort((a, b) => {
                    const aIsDead = deadCharacters.has(a.character);
                    const bIsDead = deadCharacters.has(b.character);
                    // Live characters first, then dead characters
                    if (aIsDead && !bIsDead) return 1;
                    if (!aIsDead && bIsDead) return -1;
                    // Within each group, sort alphabetically
                    return a.character.localeCompare(b.character);
                  })
                  .map(({ character, player }) => 
                    renderCharacterBox(character, player)
                  )}
              </div>
            )}
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
      </div>

      {/* Main Content - Map and Log */}
      <div className="w-full px-6 flex flex-row gap-6">
        {/* Map Panel - Square, positioned on the left */}
        <div className="flex-shrink-0" style={{ width: '55%' }}>
          <div className="bg-white border-2 border-amber-300 rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold text-amber-800 mb-4">🗺️ Game Map</h2>
            <div className="aspect-square w-full overflow-hidden">
              <SessionMap sessionId={sessionId} characterIcons={characterIcons} />
            </div>
          </div>
        </div>
        
        {/* Session Log - Takes remaining space */}
        <div className="flex-1">
          {getFilteredDays(sessionData).map(([dayKey, dayData]) => renderDay(dayKey, dayData))}
        </div>
      </div>
    </div>
  );
} 