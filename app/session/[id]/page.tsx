'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import SessionMap from '../../../components/SessionMap';
import Image from 'next/image';

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

// Helper to map action codes to action names
const BLOCKED_ACTION_MAP: Record<string, string> = {
  'M-': 'Move',
  'H': 'Hide',
  'S': 'Search',
  'T': 'Trade',
  'R': 'Rest',
  'A': 'Alert',
  'F': 'Follow',
  'EX': 'Enchant',
  'E': 'Enchant',
  'P': 'Peer',
  'RE': 'Remove Enchant',
  'C': 'Cache',
};

function getBlockedActionType(result: string) {
  // result: 'Cannot perform action M-CV2' or similar
  const code = result.replace('Cannot perform action ', '');
  for (const prefix in BLOCKED_ACTION_MAP) {
    if (code.startsWith(prefix)) {
      return BLOCKED_ACTION_MAP[prefix];
    }
  }
  return 'Action';
}

interface SessionPageProps {
  sessionId?: string;
  setSelectedPage?: (page: 'home' | 'characters' | 'monsters' | 'natives' | 'log' | 'games' | 'map' | 'game-logs' | 'session') => void;
  setSelectedCharacter?: (character: string | null) => void;
}

export default function SessionPage(props: SessionPageProps = {}) {
  const { sessionId: sessionIdProp, setSelectedPage, setSelectedCharacter } = props;
  const params = useParams();
  const sessionId = sessionIdProp || (params.id as string);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemCache, setItemCache] = useState<Record<string, Item>>({});
  const [sessionTitles, setSessionTitles] = useState<{ mainTitle: string; subtitle: string } | null>(null);
  const [characterInventories, setCharacterInventories] = useState<any>(null);
  const [deadCharacters, setDeadCharacters] = useState<Set<string>>(new Set());
  const [characterStats, setCharacterStats] = useState<any>(null);
  const [finalScores, setFinalScores] = useState<any>(null);
  const [scorePopover, setScorePopover] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('1_1');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(false);
  const [autoAdvanceInterval, setAutoAdvanceInterval] = useState<NodeJS.Timeout | null>(null);
  const [hoveredCharacter, setHoveredCharacter] = useState<string | null>(null);
  const [hoveredCharacterData, setHoveredCharacterData] = useState<any>(null);
  const [hoveredCharacterStats, setHoveredCharacterStats] = useState<any>(null);

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
          
          // Set initial selected day and month to the last day
          const dayKeys = Object.keys(data.days).sort((a, b) => {
            const [am, ad] = a.split('_').map(Number);
            const [bm, bd] = b.split('_').map(Number);
            return am !== bm ? am - bm : ad - bd;
          });
          if (dayKeys.length > 0) {
            setSelectedDay(dayKeys[dayKeys.length - 1]);
            const [lastMonth] = dayKeys[dayKeys.length - 1].split('_').map(Number);
            setSelectedMonth(lastMonth);
          }
          
          // Fetch session titles from session-titles API
          try {
            const titlesResponse = await fetch(`/api/session/${sessionId}/session-titles`);
            if (titlesResponse.ok) {
              const titlesData = await titlesResponse.json();
              setSessionTitles({
                mainTitle: titlesData.mainTitle,
                subtitle: titlesData.subtitle
              });
            }
          } catch (error) {
            console.error('Failed to fetch session titles:', error);
          }
        } else {
          console.error('SessionPage: Failed to load session data');
        }
      } catch (error) {
        console.error('SessionPage: Error fetching session data:', error);
      } finally {
        setLoading(false);
      }

      // Character inventories will be fetched in a separate useEffect to avoid race conditions
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

  // Auto-advance functionality
  useEffect(() => {
    if (isAutoAdvancing && sessionData) {
      const dayKeys = Object.keys(sessionData.days).sort((a, b) => {
        const [am, ad] = a.split('_').map(Number);
        const [bm, bd] = b.split('_').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });
      
      const currentIndex = dayKeys.indexOf(selectedDay);
      
      if (currentIndex < dayKeys.length - 1) {
        const interval = setTimeout(() => {
          const nextDay = dayKeys[currentIndex + 1];
          setSelectedDay(nextDay);
          const [month] = nextDay.split('_').map(Number);
          setSelectedMonth(month);
        }, 3000);
        
        setAutoAdvanceInterval(interval);
      } else {
        // Reached the end, stop auto-advancing
        setIsAutoAdvancing(false);
      }
    } else if (autoAdvanceInterval) {
      clearTimeout(autoAdvanceInterval);
      setAutoAdvanceInterval(null);
    }

    return () => {
      if (autoAdvanceInterval) {
        clearTimeout(autoAdvanceInterval);
      }
    };
  }, [isAutoAdvancing, selectedDay, sessionData]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!sessionId) return;
      
      console.log('SessionPage: Fetching character stats for:', sessionId);
      try {
        const res = await fetch(`/api/session/${sessionId}/character-stats`);
        console.log('SessionPage: Character stats response status:', res.status);
        if (res.ok) {
          const statsData = await res.json();
          console.log('SessionPage: Character stats loaded:', statsData);
          setCharacterStats(statsData);
        } else {
          console.error('SessionPage: Failed to load character stats, status:', res.status);
          setCharacterStats(null);
        }
      } catch (e) {
        console.error('SessionPage: Error fetching character stats:', e);
        setCharacterStats(null);
      }
    };
    fetchStats();
  }, [sessionId]);

  // Fetch character inventories
  useEffect(() => {
    const fetchInventories = async () => {
      if (!sessionId) return;
      
      console.log('SessionPage: Fetching character inventories for:', sessionId);
      try {
        const res = await fetch(`/api/session/${sessionId}/character-inventories`);
        console.log('SessionPage: Character inventories response status:', res.status);
        if (res.ok) {
          const invData = await res.json();
          console.log('SessionPage: Character inventories loaded:', invData);
          setCharacterInventories(invData);
        } else {
          console.error('SessionPage: Failed to load character inventories, status:', res.status);
          setCharacterInventories(null);
        }
      } catch (e) {
        console.error('SessionPage: Error fetching character inventories:', e);
        setCharacterInventories(null);
      }
    };
    fetchInventories();
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
              <span className="text-[#6b3e26] font-serif font-semibold">Type {item.attributeBlocks.this.spell}</span>
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
      .sort(([a], [b]) => {
        const [am, ad] = a.split('_').map(Number);
        const [bm, bd] = b.split('_').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });
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

  // Helper function to check if combat has meaningful actions
  const hasMeaningfulCombat = (dayData: DayData) => {
    if (!dayData.battles || dayData.battles.length === 0) return false;
    
    return dayData.battles.some(battle => {
      // Check if any round has meaningful actions beyond just END
      return battle.rounds.some(round => {
        const hasNonEndActions = round.actions.some(action => 
          !action.action.includes('Presses the END combat button') &&
          !action.action.includes('END combat')
        );
        const hasAttacks = round.attacks && round.attacks.length > 0;
        const hasDamage = round.damage && round.damage.length > 0;
        const hasDeaths = round.deaths && round.deaths.length > 0;
        const hasFameGains = round.fameGains && round.fameGains.length > 0;
        const hasSpellCasting = round.spellCasting && round.spellCasting.length > 0;
        const hasFatigue = round.fatigue && round.fatigue.length > 0;
        const hasDisengagement = round.disengagement && round.disengagement.length > 0;
        
        return hasNonEndActions || hasAttacks || hasDamage || hasDeaths || 
               hasFameGains || hasSpellCasting || hasFatigue || hasDisengagement;
      });
    });
  };

  // Calendar component
  const renderCalendar = () => {
    if (!sessionData) return null;
    
    const dayKeys = Object.keys(sessionData.days).sort((a, b) => {
      const [am, ad] = a.split('_').map(Number);
      const [bm, bd] = b.split('_').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
    
    // Group days by month
    const months: { [key: number]: string[] } = {};
    dayKeys.forEach(dayKey => {
      const [month] = dayKey.split('_').map(Number);
      if (!months[month]) months[month] = [];
      months[month].push(dayKey);
    });
    
    const sortedMonths = Object.keys(months).map(Number).sort((a, b) => a - b);
    const currentMonthDays = months[selectedMonth] || [];
    
    const goToPreviousMonth = () => {
      const currentIndex = sortedMonths.indexOf(selectedMonth);
      if (currentIndex > 0) {
        setSelectedMonth(sortedMonths[currentIndex - 1]);
      }
    };
    
    const goToNextMonth = () => {
      const currentIndex = sortedMonths.indexOf(selectedMonth);
      if (currentIndex < sortedMonths.length - 1) {
        setSelectedMonth(sortedMonths[currentIndex + 1]);
      }
    };

    // Day navigation functions
    const goToPreviousDay = () => {
      const currentIndex = dayKeys.indexOf(selectedDay);
      if (currentIndex > 0) {
        setSelectedDay(dayKeys[currentIndex - 1]);
        const [month] = dayKeys[currentIndex - 1].split('_').map(Number);
        setSelectedMonth(month);
      }
    };

    const goToNextDay = () => {
      const currentIndex = dayKeys.indexOf(selectedDay);
      if (currentIndex < dayKeys.length - 1) {
        setSelectedDay(dayKeys[currentIndex + 1]);
        const [month] = dayKeys[currentIndex + 1].split('_').map(Number);
        setSelectedMonth(month);
      }
    };

    const goToFirstDay = () => {
      if (dayKeys.length > 0) {
        setSelectedDay(dayKeys[0]);
        const [month] = dayKeys[0].split('_').map(Number);
        setSelectedMonth(month);
      }
    };

    const goToLastDay = () => {
      if (dayKeys.length > 0) {
        setSelectedDay(dayKeys[dayKeys.length - 1]);
        const [month] = dayKeys[dayKeys.length - 1].split('_').map(Number);
        setSelectedMonth(month);
      }
    };

    const toggleAutoAdvance = () => {
      if (!isAutoAdvancing) {
        // Starting auto-advance
        const currentIndex = dayKeys.indexOf(selectedDay);
        if (currentIndex === dayKeys.length - 1) {
          // We're on the last day, jump to day 1 and start
          setSelectedDay(dayKeys[0]);
          const [month] = dayKeys[0].split('_').map(Number);
          setSelectedMonth(month);
        }
        setIsAutoAdvancing(true);
      } else {
        // Stopping auto-advance
        setIsAutoAdvancing(false);
      }
    };
    
    return (
      <div className="mb-6 p-4 bg-white border-2 border-amber-300 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            disabled={sortedMonths.indexOf(selectedMonth) === 0}
            className="p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-amber-800">📅 Month {selectedMonth}</h3>
          <button
            onClick={goToNextMonth}
            disabled={sortedMonths.indexOf(selectedMonth) === sortedMonths.length - 1}
            className="p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-6 sm:gap-2">
          {currentMonthDays.map(dayKey => {
            const [, day] = dayKey.split('_').map(Number);
            const dayData = sessionData.days[dayKey];
            const hasMeaningfulCombatAction = hasMeaningfulCombat(dayData);
            const hasActions = dayData.characterTurns && dayData.characterTurns.length > 0;
            
            return (
              <button
                key={dayKey}
                onClick={() => setSelectedDay(dayKey)}
                className={`
                  p-1 sm:p-2 text-xs sm:text-sm font-medium rounded border transition-colors
                  ${selectedDay === dayKey 
                    ? 'bg-amber-500 text-white border-amber-600' 
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }
                  ${hasMeaningfulCombatAction ? 'ring-2 ring-red-400' : ''}
                  ${hasActions ? 'font-bold' : 'font-normal'}
                `}
                title={`Month ${selectedMonth}, Day ${day}${hasMeaningfulCombatAction ? ' - Combat!' : ''}${hasActions ? ' - Actions' : ''}`}
              >
                {day}
                {hasMeaningfulCombatAction && <span className="block text-xs">⚔️</span>}
              </button>
            );
          })}
        </div>
        
        {/* Day Navigation Arrows */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={goToFirstDay}
              disabled={dayKeys.indexOf(selectedDay) === 0}
              className="p-1 sm:p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Go to first day"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToPreviousDay}
              disabled={dayKeys.indexOf(selectedDay) === 0}
              className="p-1 sm:p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Previous day"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-xs sm:text-sm font-medium text-amber-800 mb-1 sm:mb-2">
              Day {dayKeys.indexOf(selectedDay) + 1} of {dayKeys.length}
            </div>
            <button
              onClick={toggleAutoAdvance}
              disabled={dayKeys.indexOf(selectedDay) === dayKeys.length - 1}
              className={`p-1 sm:p-2 rounded-full transition-colors ${
                isAutoAdvancing 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              title={isAutoAdvancing ? "Pause auto-advance" : "Play auto-advance (3s delay)"}
            >
              {isAutoAdvancing ? (
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={goToNextDay}
              disabled={dayKeys.indexOf(selectedDay) === dayKeys.length - 1}
              className="p-1 sm:p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Next day"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToLastDay}
              disabled={dayKeys.indexOf(selectedDay) === dayKeys.length - 1}
              className="p-1 sm:p-2 text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Go to last day"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7m-8 0l7-7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Day Log integrated in the same panel */}
        {sessionData.days[selectedDay] && (
          <div className="border-t border-amber-200 pt-4">
            {renderDay(selectedDay, sessionData.days[selectedDay])}
          </div>
        )}
      </div>
    );
  };

  const renderDay = (dayKey: string, dayData: DayData) => {
    const dayNumber = dayKey.replace('day_', '').replace('.txt', '');
    const [month, day] = dayNumber.split('_');
    
    return (
      <div key={dayKey}>
        <h2 className="text-xl font-bold text-amber-800 mb-4">
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
                    {(() => {
                      let blockedFound = false;
                      let hideSucceeded = false;
                      return turn.actions.map((action, actionIndex) => {
                        if (blockedFound) return null;
                        // BLOCKED logic
                        if (action.action === 'BLOCKED' && action.result && action.result.startsWith('Cannot perform action')) {
                          const actionType = getBlockedActionType(action.result);
                          blockedFound = true;
                          return (
                            <div key={actionIndex} className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">{actionType}</span>
                              <span className="text-red-600 font-semibold"> - Blocked</span>
                            </div>
                          );
                        }
                        // Hide logic
                        if (action.action === 'Hide') {
                          if (action.result === 'N/A') return null;
                          if (hideSucceeded) return null;
                          if (action.result === 'Succeeded') {
                            hideSucceeded = true;
                            return (
                              <div key={actionIndex} className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">{renderTextWithItems(action.action)}</span>
                                <span className="text-green-600 font-semibold"> - {renderTextWithItems(action.result)}</span>
                              </div>
                            );
                          }
                        }
                        return (
                          <div key={actionIndex} className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">{renderTextWithItems(action.action)}</span>
                            {action.result && (
                              <span className="text-gray-500"> - {renderTextWithItems(action.result)}</span>
                            )}
                          </div>
                        );
                      });
                    })()}
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
        {hasMeaningfulCombat(dayData) && (
          <div>
            <h3 className="text-xl font-bold text-red-700 mb-3">⚔️ Combat</h3>
            {dayData.battles
              .filter(combat => {
                // Filter out combats that only have END actions
                return combat.rounds.some(round => {
                  const hasNonEndActions = round.actions.some(action => 
                    !action.action.includes('Presses the END combat button') &&
                    !action.action.includes('END combat')
                  );
                  const hasAttacks = round.attacks && round.attacks.length > 0;
                  const hasDamage = round.damage && round.damage.length > 0;
                  const hasDeaths = round.deaths && round.deaths.length > 0;
                  const hasFameGains = round.fameGains && round.fameGains.length > 0;
                  const hasSpellCasting = round.spellCasting && round.spellCasting.length > 0;
                  const hasFatigue = round.fatigue && round.fatigue.length > 0;
                  const hasDisengagement = round.disengagement && round.disengagement.length > 0;
                  
                  return hasNonEndActions || hasAttacks || hasDamage || hasDeaths || 
                         hasFameGains || hasSpellCasting || hasFatigue || hasDisengagement;
                });
              })
              .map((combat, index) => renderCombat(combat, index))}
          </div>
        )}
      </div>
    );
  };

  // Function to get character icon path
  const getCharacterIconPath = (characterName: string) => {
    const iconName = characterName + '_symbol.png';
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

  // Function to categorize items based on name
  const categorizeItemByName = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Weapons
    if (name.includes('bow') || name.includes('sword') || name.includes('axe') || 
        name.includes('spear') || name.includes('mace') || name.includes('staff') ||
        name.includes('crossbow') || name.includes('halberd') || name.includes('broadsword') ||
        name.includes('great sword') || name.includes('great axe') || name.includes('morning star') ||
        name.includes('thrusting sword') || name.includes('short sword')) {
      return 'weapon';
    }
    
    // Armor
    if (name.includes('armor') || name.includes('shield') || name.includes('helmet') ||
        name.includes('breastplate') || name.includes('greaves') || name.includes('gauntlets')) {
      return 'armor';
    }
    
    // Spells
    if (name.includes('peace with nature') || name.includes('type vii') || name.includes('type vi') ||
        name.includes('type v') || name.includes('type iv') || name.includes('type iii') ||
        name.includes('type ii') || name.includes('type i')) {
      return 'spell';
    }
    
    // Great Treasures
    if (name.includes('great') && (name.includes('treasure') || name.includes('sword') || 
        name.includes('axe') || name.includes('armor'))) {
      return 'great_treasure';
    }
    
    // Regular Treasures
    if (name.includes('treasure') || name.includes('gold') || name.includes('jewel') ||
        name.includes('gem') || name.includes('coin')) {
      return 'treasure';
    }
    
    // Natives
    if (name.includes('native') || name.includes('guard') || name.includes('mercenary') ||
        name.includes('lancer') || name.includes('dwarf') || name.includes('elf')) {
      return 'native';
    }
    
    return 'other';
  };

  // Fetch character data and stats on hover
  useEffect(() => {
    if (!hoveredCharacter) {
      setHoveredCharacterData(null);
      setHoveredCharacterStats(null);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [charRes, statsRes] = await Promise.all([
          fetch(`/api/characters/${encodeURIComponent(hoveredCharacter)}`),
          fetch(`/api/characters/${encodeURIComponent(hoveredCharacter)}/stats`)
        ]);
        if (!cancelled && charRes.ok && statsRes.ok) {
          const charData = await charRes.json();
          const statsData = await statsRes.json();
          setHoveredCharacterData(charData.character);
          setHoveredCharacterStats(statsData);
        }
      } catch {}
    };
    fetchData();
    return () => { cancelled = true; };
  }, [hoveredCharacter]);

  // Pre-fetch item data for all characters when inventories are loaded
  useEffect(() => {
    if (!characterInventories) return;
    
    const fetchAllItemData = async () => {
      const allItems = new Set<string>();
      
      // Collect all unique item names from all characters
      Object.values(characterInventories).forEach((charData: any) => {
        if (charData?.items) {
          const itemArrays = [
            charData.items.weapons,
            charData.items.armor,
            charData.items.treasures,
            charData.items.great_treasures,
            charData.items.spells,
            charData.items.natives,
            charData.items.other,
            charData.items.unknown
          ];
          
          itemArrays.flat().filter(Boolean).forEach((item: any) => {
            if (item?.name) {
              allItems.add(item.name);
            }
          });
        }
      });
      
      // Pre-fetch data for all items
      for (const itemName of Array.from(allItems)) {
        if (!itemCache[itemName]) {
          await fetchItem(itemName);
        }
      }
    };
    
    fetchAllItemData();
  }, [characterInventories, itemCache]);

  const renderCharacterBox = (characterName: string, playerName: string) => {
    const inventory = characterInventories?.[characterName]?.items;
    const isDead = deadCharacters.has(characterName);
    console.log(`Rendering ${characterName}:`, { inventory, characterInventories: characterInventories?.[characterName] });
    
    // Collect all items from all inventory categories, flatten, and deduplicate by name
    const allInventoryArrays = [
      inventory?.weapons,
      inventory?.armor,
      inventory?.treasures,
      inventory?.great_treasures,
      inventory?.spells,
      inventory?.natives,
      inventory?.other,
      inventory?.unknown
    ];
    const allItemsRaw = allInventoryArrays.flat().filter(Boolean);
    const seenNames = new Set();
    const allItems = allItemsRaw.filter(item => {
      if (!item || !item.name) return false;
      if (seenNames.has(item.name)) return false;
      seenNames.add(item.name);
      return true;
    });

    // Helper to get category from fetched item data or fallback to heuristic
    const getItemCategory = (item) => {
      const cached = itemCache[item.name];
      if (cached) {
        // Use attributeBlocks to determine type
        if (cached.attributeBlocks.intact && cached.attributeBlocks.damaged) return 'armor';
        if (cached.attributeBlocks.unalerted && cached.attributeBlocks.alerted) return 'weapon';
        if (cached.attributeBlocks.this?.spell) return 'spell';
        if (cached.attributeBlocks.this?.base_price) {
          // Check if it's a large treasure
          if (cached.attributeBlocks.this?.treasure === 'large') return 'large_treasure';
          return 'treasure';
        }
        // Add more rules as needed
      }
      // Fallback to heuristic
      return categorizeItemByName(item.name);
    };

    // Helper to check if item is a large treasure
    const isLargeTreasure = (item) => {
      const cached = itemCache[item.name];
      return cached?.attributeBlocks.this?.treasure === 'large';
    };

    // Categorize items for display
    const equipmentItems = allItems.filter(item => {
      const cat = getItemCategory(item);
      // Equipment: weapons, armor, mounts, lanterns, etc. (not treasure, not spell, not great treasure)
      return cat === 'weapon' || cat === 'armor' || cat === 'mount' || (cat === 'other' && !item.name.toLowerCase().includes('treasure') && !item.name.toLowerCase().includes('spell'));
    });
    const treasureItems = allItems.filter(item => {
      const cat = getItemCategory(item);
      return cat === 'treasure' && !item.name.toLowerCase().includes('great') && !isLargeTreasure(item);
    });
    const largeTreasureItems = allItems.filter(item => isLargeTreasure(item));
    const greatTreasureItems = allItems.filter(item => getItemCategory(item) === 'great_treasure' || (getItemCategory(item) === 'treasure' && item.name.toLowerCase().includes('great')));
    const spellItems = allItems.filter(item => getItemCategory(item) === 'spell');

    // Render helpers for each line
    const renderItemLine = (items: any[], icon: React.ReactNode = null, extraClass = '') => (
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${extraClass}`}>
        {items.map((item, idx) => (
          <span key={item.name} className={"relative group inline-block text-sm cursor-pointer" + (icon ? ' flex items-center' : '')} onMouseEnter={() => fetchItem(item.name)}>
            {icon && <span className="mr-1">{icon}</span>}
            <span className={isLargeTreasure(item) ? 'bg-yellow-200 border border-yellow-400 rounded px-1' : ''}>
              {item.name}
            </span>
            {idx < items.length - 1 ? ',' : ''}
            <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {renderEquipmentTooltip(item.name)}
            </div>
          </span>
        ))}
      </div>
    );

    // Render spells as a separate section
    const renderSpells = () => (
      spellItems.length > 0 && (
        <div className="mt-2">
          <span className="text-blue-700 font-semibold text-xs">Spells: </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {spellItems.map((item, idx) => (
              <span key={item.name} className="relative group inline-block text-xs cursor-pointer text-blue-700" onMouseEnter={() => fetchItem(item.name)}>
                {item.name}{idx < spellItems.length - 1 ? ',' : ''}
                <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  {renderEquipmentTooltip(item.name)}
                </div>
              </span>
            ))}
          </div>
        </div>
      )
    );

    // Calculate stats
    const stats = characterStats?.[characterName] || { gold: 0, fame: 0, notoriety: 0, startingSpells: 0 };
    // Great treasures
    const gtCount = allItems.filter(item => getItemCategory(item) === 'great_treasure').length;
    // Learned spells: total spells - starting spells
    const spellCount = allItems.filter(item => getItemCategory(item) === 'spell').length;
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

    // For great treasures, use a simple icon (e.g., 💎) or styled span
    const greatTreasureIcon = <span className="font-bold text-yellow-900">💎</span>;

    return (
      <div key={characterName} className={`rounded-lg border-2 p-4 mb-4 shadow-md ${isDead ? 'bg-gray-200 border-gray-400' : 'bg-white border-amber-300'} w-[340px] min-h-[220px] flex flex-col`}
           onMouseEnter={() => setHoveredCharacter(characterName)}
           onMouseLeave={() => setHoveredCharacter(null)}>
        {/* Header */}
        <div className="flex items-center mb-2">
          <span className="font-bold text-lg text-amber-800 cursor-pointer hover:underline" onClick={() => handleCharacterClick(characterName)}>{characterName}</span>
          <span className="ml-2 text-sm text-gray-500">({playerName})</span>
          {isDead && <span className="ml-2 text-xs text-red-600 font-bold">DEAD</span>}
        </div>
        {/* Main content: left (items, spells), right (stats) */}
        <div className="flex flex-row flex-1">
          {/* Left: Items, treasures, spells */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              {equipmentItems.length > 0 && renderItemLine(equipmentItems)}
              {treasureItems.length > 0 && renderItemLine(treasureItems, renderTreasureBagIcon())}
              {largeTreasureItems.length > 0 && renderItemLine(largeTreasureItems, renderTreasureBagIcon())}
              {greatTreasureItems.length > 0 && renderItemLine(greatTreasureItems, greatTreasureIcon)}
            </div>
            {/* Spells section */}
            {renderSpells()}
          </div>
          {/* Right: Stats, centered vertically */}
          <div className="flex flex-col items-end justify-center ml-4 text-xs font-mono text-amber-900 space-y-1">
            <div><span className="font-bold">gt</span>: {gtCount}</div>
            <div><span className="font-bold">s</span>: {learnedSpells}</div>
            <div><span className="font-bold">f</span>: {stats.fame}</div>
            <div><span className="font-bold">n</span>: {stats.notoriety}</div>
            <div><span className="font-bold">g</span>: {stats.gold}</div>
          </div>
        </div>
        {/* Final Score on the right bottom */}
        <div className="flex justify-end mt-2">
          <div className="relative">
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

  const handleCharacterClick = (characterName: string) => {
    if (setSelectedCharacter && setSelectedPage) {
      setSelectedCharacter(characterName);
      setSelectedPage('characters');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center w-full">
        <div className="text-2xl text-amber-800">Loading session data...</div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center w-full">
        <div className="text-2xl text-amber-800">Session not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 w-full">
      {/* Session Overview - Full width to match columns below */}
      <div className="w-full px-4 sm:px-6">
        <div className="mb-8 p-4 sm:p-6 bg-white border-2 border-amber-300 rounded-lg shadow-lg w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4 text-center">
            {sessionTitles ? sessionTitles.mainTitle : '📊 Session Overview'}
            {sessionTitles?.subtitle && (
              <div className="text-base sm:text-lg text-amber-600 mt-2 font-normal">
                {sessionTitles.subtitle}
              </div>
            )}
          </h2>
          {/* Character Boxes */}
          <div className="mb-6 w-full">
            <h3 className="text-xl font-bold text-amber-700 mb-4">👥 Characters</h3>
            {(!characterStats || !characterInventories) ? (
              <div className="text-center text-[#4b3a1e] font-serif italic">Loading character data...</div>
            ) : (
              Object.entries(sessionData.characterToPlayer).map(([character, player]) => 
                renderCharacterBox(character, player)
              )
            )}
          </div>
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 w-full">
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
      <div className="w-full px-4 sm:px-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Map Panel - Square, positioned on the left */}
        <div className="w-full lg:w-1/2 xl:w-3/5">
          <div className="bg-white border-2 border-amber-300 rounded-lg shadow-lg p-4 w-full">
            <h2 className="text-xl font-bold text-amber-800 mb-4">🗺️ Game Map</h2>
            <div className="aspect-square w-full overflow-hidden">
              <SessionMap sessionId={sessionId} characterIcons={characterIcons} selectedDay={selectedDay} />
            </div>
          </div>
        </div>
        
        {/* Session Log - Takes remaining space */}
        <div className="w-full lg:w-1/2 xl:w-2/5">
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
} 