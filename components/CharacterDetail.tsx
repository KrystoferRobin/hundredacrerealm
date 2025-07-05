"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import React from 'react';

interface CharacterPart {
  id: string;
  name: string;
  content: string;
  attributeBlocks: Record<string, any>;
}

interface Character {
  id: string;
  name: string;
  source: 'xml' | 'rschar';
  ids?: string[];
  parts: CharacterPart[];
  attributeBlocks: Record<string, any>;
}

interface Item {
  id: string;
  name: string;
  type: string;
  description?: string;
  image?: string;
  attributeBlocks: Record<string, any>;
}

interface CharacterDetailProps {
  characterName: string;
  setSelectedCharacter: (character: string | null) => void;
  setSelectedPage: (page: 'home' | 'characters' | 'monsters' | 'natives' | 'log' | 'games' | 'map' | 'game-logs' | 'session') => void;
}

export default function CharacterDetail({ characterName, setSelectedCharacter, setSelectedPage }: CharacterDetailProps) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemCache, setItemCache] = useState<Record<string, Item>>({});
  const [characterStats, setCharacterStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sessionTitles, setSessionTitles] = useState<Record<string, { mainTitle: string; subtitle: string }>>({});

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch character');
        }
        const data = await response.json();
        setCharacter(data.character);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    const fetchCharacterStats = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/stats`);
        if (response.ok) {
          const data = await response.json();
          setCharacterStats(data);
          
          // Fetch session titles for the games
          if (data.games && data.games.length > 0) {
            const sessionIds = data.games.map((game: any) => game.sessionId);
            const titles: Record<string, { mainTitle: string; subtitle: string }> = {};
            
            await Promise.all(
              sessionIds.map(async (sessionId: string) => {
                try {
                  const titleResponse = await fetch(`/api/session/${sessionId}/session-titles`);
                  if (titleResponse.ok) {
                    const titleData = await titleResponse.json();
                    titles[sessionId] = {
                      mainTitle: titleData.mainTitle,
                      subtitle: titleData.subtitle
                    };
                  }
                } catch (err) {
                  console.log(`Failed to fetch session title for ${sessionId}:`, err);
                }
              })
            );
            
            setSessionTitles(titles);
          }
        }
      } catch (err) {
        console.log('Failed to load character stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (characterName) {
      fetchCharacter();
      fetchCharacterStats();
    }
  }, [characterName]);

  // Function to get the character portrait path
  const getCharacterPortraitPath = (characterName: string) => {
    // Handle special case for Sorceror/Sorcerer spelling inconsistency
    let portraitName = characterName.replace(/\s+/g, ' ') + '_picture.png';
    if (characterName === 'Sorceror') {
      portraitName = 'Sorcerer_picture.png';
    }
    return `/images/charportraits/${portraitName}`;
  };

  // Function to get character chits for a specific level
  const getCharacterChitsForLevel = (level: number) => {
    if (!character) return [];
    
    const chits = character.parts.filter(part => {
      const thisBlock = part.attributeBlocks.this;
      if (!thisBlock) return false;
      
      // Check for different possible field names
      const chitLevel = thisBlock.level || thisBlock.character_level || thisBlock.characterLevel;
      return chitLevel === level.toString();
    });
    
    return chits;
  };

  // Function to render a character chit
  const renderCharacterChit = (chit: CharacterPart) => {
    const thisBlock = chit.attributeBlocks.this || {};
    const action = thisBlock.action || '';
    const speed = thisBlock.speed || '';
    const strength = thisBlock.strength || '';
    const effort = thisBlock.effort || 0;
    
    // Convert effort to asterisks
    const effortStars = '*'.repeat(parseInt(effort.toString()) || 0);
    
    return (
      <div key={chit.id} className="bg-[#fff8e1] p-2 rounded border border-[#bfa76a] flex flex-col items-center justify-center text-center min-h-[60px]">
        <div className="text-xs font-semibold text-[#6b3e26] font-serif">
          {action} {speed}
        </div>
        <div className="text-xs text-[#4b3a1e] font-serif">
          {strength}{effortStars}
        </div>
      </div>
    );
  };

  // Function to get level information
  const getLevelInfo = (levelKey: string) => {
    if (!character) return null;
    
    const levelData = character.attributeBlocks[levelKey];
    if (!levelData) return null;
    
    const levelNumber = levelKey.replace('level_', '');
    const levelName = levelData.name || `Level ${levelNumber}`;
    
    // Get equipment
    const equipment = levelData.weapon || levelData.equipment || [];
    const equipmentList = Array.isArray(equipment) ? equipment : [equipment];
    
    // Get spells
    const spellCount = levelData.spellcount || 0;
    const spellTypes = levelData.spelltypes || {};
    const spells = Object.values(spellTypes).map((spellType: any) => `Type ${spellType}`);
    
    // Get advantages
    const advantages = levelData.advantages || {};
    const advantageList = Object.values(advantages);
    
    return {
      levelNumber,
      levelName,
      equipment: equipmentList.filter(Boolean),
      spells: spells.filter(Boolean),
      advantages: advantageList.filter(Boolean)
    };
  };

  // Function to fetch item data from local coregamedata
  const fetchItem = async (itemName: string): Promise<Item | null> => {
    if (itemCache[itemName]) {
      return itemCache[itemName];
    }

    try {
      // Try to find the item in coregamedata
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
    if (!sideData) return null;

    const backgroundColor = getChitColor(sideData.chit_color || 'white');
    const armorValue = sideData.armor || '?';

    return (
      <div 
        className="relative w-12 h-12 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1"
        style={{ backgroundColor }}
      >
        <div className="text-xs font-bold text-[#6b3e26] text-center">{armorValue}</div>
        <div className="text-xs text-[#6b3e26] text-center capitalize">{side}</div>
      </div>
    );
  };

  // Function to render weapon chit
  const renderWeaponChit = (item: Item, side: 'unalerted' | 'alerted') => {
    const sideData = item.attributeBlocks[side];
    if (!sideData) return null;

    const backgroundColor = getChitColor(sideData.chit_color || 'white');
    const attackValue = sideData.attack_speed || sideData.attack || '?';
    const speedValue = sideData.speed || '?';

    return (
      <div 
        className="relative w-12 h-12 border-2 border-[#6b3e26] rounded-md flex flex-col justify-between p-1"
        style={{ backgroundColor }}
      >
        <div className="text-xs font-bold text-[#6b3e26] text-center">{attackValue}</div>
        <div className="text-xs text-[#6b3e26] text-center">{speedValue}</div>
        <div className="text-xs text-[#6b3e26] text-center capitalize">{side}</div>
      </div>
    );
  };

  // Function to render treasure chit
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

  // Function to render item with tooltip
  const renderItemWithTooltip = (itemName: string) => {
    return (
      <span className="relative group">
        <span 
          className="text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
          onMouseEnter={() => fetchItem(itemName)}
        >
          {itemName}
        </span>
        <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {renderEquipmentTooltip(itemName)}
        </div>
      </span>
    );
  };

  // Helper function to safely render strings
  const safeString = (str: any): string => {
    if (typeof str === 'string') return str;
    if (Array.isArray(str)) return str.join(', ');
    return String(str || '');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Character...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Character Not Found</div>
          <div className="text-[#6b3e26] font-serif mb-4">{error || 'Character could not be loaded'}</div>
          <button 
            onClick={() => {
              setSelectedCharacter(null);
              setSelectedPage('characters');
            }}
            className="bg-[#bfa76a] text-[#6b3e26] px-4 py-2 rounded-lg font-serif hover:bg-[#a8955a] transition-colors"
          >
            Back to Characters
          </button>
        </div>
      </div>
    );
  }

  // Extract relationship block
  const relationshipBlock = character.attributeBlocks.relationships || {};

  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Back to Characters Button */}
      <div className="mb-4">
        <button 
          onClick={() => {
            setSelectedCharacter(null);
            setSelectedPage('characters');
          }}
          className="bg-[#bfa76a] text-[#6b3e26] px-4 py-2 rounded-lg font-serif hover:bg-[#a8955a] transition-colors flex items-center gap-2 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Characters
        </button>
      </div>
      
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {/* Top Row: Info and Portrait */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Info Panel (left) */}
          <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative flex flex-col justify-between"
               style={{ boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            {/* Decorative corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
            {/* Name and type */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[#6b3e26] font-serif mb-2 relative">
                <span className="relative z-10">{character.name}</span>
                <div className="absolute inset-0 bg-[#bfa76a] opacity-10 blur-sm rounded-lg"></div>
              </h2>
              <div className="text-lg text-[#4b3a1e] font-serif">
                <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                  character.source === 'xml' 
                    ? 'bg-[#bfa76a] text-[#6b3e26]' 
                    : 'bg-[#6b3e26] text-[#fff8e1]'
                }`}>
                  <div>{character.source === 'xml' ? 'Core Game Character' : 'Custom Character'}</div>
                  {character.attributeBlocks.this?.creator && (
                    <div className="text-xs font-normal mt-1 opacity-80">
                      by {String(character.attributeBlocks.this.creator)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Vulnerability/Start */}
            <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a] mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {character.attributeBlocks.this?.vulnerability && (
                  <div>
                    <p className="text-xs font-semibold text-[#6b3e26] font-serif">Vulnerability</p>
                    <p className="text-sm text-[#4b3a1e] font-serif">{String(character.attributeBlocks.this.vulnerability)}</p>
                  </div>
                )}
                {character.attributeBlocks.this?.start && (
                  <div>
                    <p className="text-xs font-semibold text-[#6b3e26] font-serif">Start</p>
                    <p className="text-sm text-[#4b3a1e] font-serif">{String(character.attributeBlocks.this.start)}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Game Statistics */}
            {!statsLoading && characterStats && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#6b3e26] font-serif">Game Statistics</h3>
                <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Games Played</p>
                      <p className="text-[#4b3a1e] font-serif">{characterStats.totalPlays || characterStats.games?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Total Deaths</p>
                      <p className="text-[#4b3a1e] font-serif">{characterStats.totalDeaths || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Best Score</p>
                      <p className="text-[#4b3a1e] font-serif">{characterStats.bestScore || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Average Score</p>
                      <p className="text-[#4b3a1e] font-serif">{characterStats.averageScore || 0}</p>
                    </div>
                  </div>
                  {/* Recent Games */}
                  {characterStats.games && characterStats.games.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#bfa76a]">
                      <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-2">Recent Games</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {characterStats.games.slice(0, 5).map((game: any, index: number) => {
                          const sessionTitle = sessionTitles[game.sessionId];
                          const displayTitle = sessionTitle ? sessionTitle.mainTitle : (game.sessionTitle || game.sessionId);
                          
                          return (
                            <div key={index} className="text-xs">
                              <span className="text-[#4b3a1e] font-serif">{displayTitle}</span>
                              <span className="text-[#6b3e26] font-serif ml-2">({game.player})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Top Killers and Killed */}
                {characterStats.topKillers && characterStats.topKillers.length > 0 && (
                  <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                    <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-2">Most Frequent Killers</p>
                    <div className="space-y-1">
                      {characterStats.topKillers.map((killer: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-[#4b3a1e] font-serif">{killer.name}</span>
                          <span className="text-[#6b3e26] font-serif">{killer.count} times</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Top Killed */}
                {characterStats.topKilled && characterStats.topKilled.length > 0 && (
                  <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                    <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-2">Most Killed</p>
                    <div className="space-y-1">
                      {characterStats.topKilled.map((killed: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-[#4b3a1e] font-serif">{killed.name}</span>
                          <span className="text-[#6b3e26] font-serif">{killed.count} times</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Portrait Panel (right) */}
          <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative flex flex-col items-center justify-between"
               style={{ boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
            {/* Decorative corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
            <h3 className="text-xl font-bold text-[#6b3e26] font-serif mb-4 text-center">Character Portrait</h3>
            <div className="flex justify-center">
              <Image
                src={getCharacterPortraitPath(character.name)}
                alt={`${character.name} portrait`}
                width={200}
                height={200}
                className="rounded-lg border-2 border-[#bfa76a]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            {/* Artist attribution */}
            {character.attributeBlocks.this?.artcredit && (
              <div className="mt-4 text-xs text-[#4b3a1e] font-serif italic text-center">
                Art by {String(character.attributeBlocks.this.artcredit)}
              </div>
            )}
          </div>
        </div>

        {/* Level Panels (below) */}
        {(() => {
          // Get all level keys from attributeBlocks
          const levelKeys = Object.keys(character.attributeBlocks).filter(key => 
            key.startsWith('level_') && key !== 'level_1' // Skip level_1 as it's usually just a name
          ).sort((a, b) => {
            const aNum = parseInt(a.replace('level_', ''));
            const bNum = parseInt(b.replace('level_', ''));
            return aNum - bNum;
          });

          // Add level_1 at the beginning if it exists
          if (character.attributeBlocks.level_1) {
            levelKeys.unshift('level_1');
          }

          const levelElements: JSX.Element[] = [];
          
          levelKeys.forEach((levelKey) => {
            const levelInfo = getLevelInfo(levelKey);
            if (!levelInfo) return;

            // Get chits for this level
            const chits = getCharacterChitsForLevel(parseInt(levelInfo.levelNumber));
            
            levelElements.push(
              <div key={levelKey} className="bg-[#f6ecd6] p-4 rounded border border-[#bfa76a] mb-6 flex flex-col md:flex-row gap-6">
                {/* Left: Level Info, Equipment, Spells, Advantages */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-[#6b3e26] font-serif mb-3">{levelInfo.levelName}</h4>
                  
                  {/* Equipment */}
                  {levelInfo.equipment.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-[#6b3e26] font-serif mb-1">Equipment:</p>
                      <ul className="list-disc list-inside ml-4">
                        {levelInfo.equipment.map((item, idx) => (
                          <li key={idx} className="text-sm text-[#4b3a1e] font-serif">
                            {renderItemWithTooltip(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Spells */}
                  {levelInfo.spells.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-[#6b3e26] font-serif mb-1">Spells:</p>
                      <ul className="list-disc list-inside ml-4">
                        {levelInfo.spells.map((spell, idx) => (
                          <li key={idx} className="text-sm text-[#4b3a1e] font-serif">
                            {renderItemWithTooltip(spell)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Advantages */}
                  {levelInfo.advantages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-[#6b3e26] font-serif mb-1">Advantages:</p>
                      <ul className="list-disc list-inside ml-4">
                        {levelInfo.advantages.map((advantage: any, idx) => (
                          <li key={idx} className="text-sm text-[#4b3a1e] font-serif">{advantage}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Right: Character Chits */}
                <div className="flex-1 min-w-0">
                  <h5 className="text-md font-semibold text-[#6b3e26] font-serif mb-3">Character Chits</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {chits.map(renderCharacterChit)}
                  </div>
                </div>
              </div>
            );
          });
          
          return levelElements;
        })()}
      </div>
    </div>
  );
} 