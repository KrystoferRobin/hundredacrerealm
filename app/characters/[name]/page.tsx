"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

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
  attributeBlocks: Record<string, any>;
  parts: any[];
}

export default function CharacterPage() {
  const params = useParams();
  const characterName = decodeURIComponent(params.name as string);
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemCache, setItemCache] = useState<Record<string, Item>>({});

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

    if (characterName) {
      fetchCharacter();
    }
  }, [characterName]);

  // Function to get the character portrait path
  const getCharacterPortraitPath = (characterName: string) => {
    const portraitName = characterName.replace(/\s+/g, ' ') + '_picture.png';
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
    
    // Debug logging
    console.log(`Level ${level} chits for ${character.name}:`, chits.map(chit => chit.name));
    
    return chits;
  };

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

  // Function to render equipment tooltip
  const renderEquipmentTooltip = (itemName: string) => {
    const item = itemCache[itemName];
    if (!item) return null;

    const isArmor = item.attributeBlocks.intact && item.attributeBlocks.damaged;
    const isWeapon = item.attributeBlocks.unalerted && item.attributeBlocks.alerted;

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
        
        {!isArmor && !isWeapon && (
          <div className="text-xs text-[#4b3a1e] font-serif">
            Item data available
          </div>
        )}
      </div>
    );
  };

  // Function to safely render any value as string
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  // Function to clean up advantages - show only the readable text
  const cleanAdvantages = (advantages: any): string[] => {
    if (!advantages || typeof advantages !== 'object') return [];
    
    const cleanAdvs: string[] = [];
    Object.entries(advantages).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        cleanAdvs.push(value.trim());
      }
    });
    
    return cleanAdvs;
  };

  // Function to render level information
  const renderLevelInfo = (levelKey: string, levelData: Record<string, any>) => {
    const level = parseInt(levelKey.replace('level_', ''));
    const chits = getCharacterChitsForLevel(level);
    
    // Helper function to safely get spell types
    const getSpellTypes = (spelltypes: any) => {
      if (!spelltypes || typeof spelltypes !== 'object') return '';
      try {
        const values = Object.keys(spelltypes).map(key => spelltypes[key]).filter(val => typeof val === 'string');
        return values.join(', ');
      } catch (error) {
        console.error('Error processing spelltypes:', error);
        return '';
      }
    };
    
    return (
      <div key={levelKey} className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a] mb-3">
        <h4 className="font-semibold text-[#6b3e26] font-serif text-sm mb-2">{safeString(levelData.name)}</h4>
        {/* Chits first, one line, separated by '   -   ' */}
        {chits.length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-[#4b3a1e] font-serif">
              {chits.map(chit => safeString(chit.name)).join('   -   ')}
            </span>
          </div>
        )}
        {/* Equipment section */}
        {(levelData.weapon || levelData.armor) && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Equipment:</p>
            <div className="space-y-1">
              {/* Weapons */}
              {levelData.weapon && (
                <div className="relative group">
                  <span 
                    className="text-xs text-[#4b3a1e] font-serif cursor-pointer hover:text-[#bfa76a] transition-colors"
                    onMouseEnter={() => fetchItem(levelData.weapon)}
                  >
                    {safeString(levelData.weapon)}
                  </span>
                  <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {renderEquipmentTooltip(levelData.weapon)}
                  </div>
                </div>
              )}
              {/* Armor - handle multiple items */}
              {levelData.armor && (
                <>
                  {levelData.armor.split(',').map((armorItem: string, index: number) => {
                    const trimmedItem = armorItem.trim();
                    return (
                      <div key={index} className="relative group">
                        <span 
                          className="text-xs text-[#4b3a1e] font-serif cursor-pointer hover:text-[#bfa76a] transition-colors"
                          onMouseEnter={() => fetchItem(trimmedItem)}
                        >
                          {trimmedItem}
                        </span>
                        <div className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          {renderEquipmentTooltip(trimmedItem)}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
        {/* Spells next */}
        {levelData.spellcount && (
          <p className="text-xs text-[#4b3a1e] font-serif mb-1">
            Spells: {safeString(levelData.spellcount)}
            {levelData.spelltypes && (
              <span className="text-[#bfa76a]">
                {' '}({getSpellTypes(levelData.spelltypes)})
              </span>
            )}
          </p>
        )}
        {/* Advantages last */}
        {levelData.advantages && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-[#6b3e26] font-serif mb-1">Advantages:</p>
            {cleanAdvantages(levelData.advantages).map((advantage, index) => (
              <p key={index} className="text-xs text-[#4b3a1e] font-serif ml-2 mb-1">
                {advantage}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Character...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Character Not Found</div>
          <div className="text-[#6b3e26] font-serif mb-4">{error || 'Character could not be loaded'}</div>
          <Link 
            href="/characters"
            className="bg-[#bfa76a] text-[#6b3e26] px-4 py-2 rounded-lg font-serif hover:bg-[#a8955a] transition-colors"
          >
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  // Get basic character info
  const thisBlock = character.attributeBlocks.this || {};
  const relationshipBlock = character.attributeBlocks.relationship || {};

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{minHeight: '100vh'}}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Character Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
            {/* Left side - Character Info */}
            <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative"
                 style={{
                   boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                 }}>
              {/* Decorative corner elements */}
              <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
              
              {/* Character Name and Tag */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-[#6b3e26] font-serif mb-2 relative">
                  <span className="relative z-10">{character.name}</span>
                  <div className="absolute inset-0 bg-[#bfa76a] opacity-10 blur-sm rounded-lg"></div>
                </h1>
                <div className="text-lg text-[#4b3a1e] font-serif">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                    character.source === 'xml' 
                      ? 'bg-[#bfa76a] text-[#6b3e26]' 
                      : 'bg-[#6b3e26] text-[#fff8e1]'
                  }`}>
                    <div>{character.source === 'xml' ? 'Core Game Character' : 'Custom Character'}</div>
                    {thisBlock.creator && (
                      <div className="text-xs font-normal mt-1 opacity-80">
                        by {safeString(thisBlock.creator)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Details */}
                <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {thisBlock.vulnerability && (
                      <div>
                        <p className="text-xs font-semibold text-[#6b3e26] font-serif">Vulnerability</p>
                        <p className="text-sm text-[#4b3a1e] font-serif">{safeString(thisBlock.vulnerability)}</p>
                      </div>
                    )}
                    {thisBlock.start && (
                      <div>
                        <p className="text-xs font-semibold text-[#6b3e26] font-serif">Start</p>
                        <p className="text-sm text-[#4b3a1e] font-serif">{safeString(thisBlock.start)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Level Information */}
                {Object.entries(character.attributeBlocks)
                  .filter(([key, data]) => key.startsWith('level_') && typeof data === 'object' && data !== null)
                  .sort(([a], [b]) => {
                    const levelA = parseInt(a.replace('level_', ''));
                    const levelB = parseInt(b.replace('level_', ''));
                    return levelA - levelB;
                  })
                  .map(([key, data]) => {
                    if (typeof data === 'object' && data !== null) {
                      return renderLevelInfo(key, data as Record<string, any>);
                    }
                    return null;
                  })}

                {/* Relationships */}
                {Object.keys(relationshipBlock).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#6b3e26] font-serif mb-3">Relationships</h3>
                    <div className="bg-[#f6ecd6] p-3 rounded border border-[#bfa76a]">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(relationshipBlock).map(([group, value]) => (
                          <div key={group} className="flex justify-between">
                            <span className="text-xs font-semibold text-[#6b3e26] font-serif capitalize">
                              {group.replace(/_/g, ' ')}:
                            </span>
                            <span className={`text-xs font-serif ${
                              parseInt(safeString(value)) > 0 ? 'text-green-700' : 
                              parseInt(safeString(value)) < 0 ? 'text-red-700' : 'text-[#4b3a1e]'
                            }`}>
                              {safeString(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Character Portrait */}
            <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative flex items-center justify-center min-h-[400px]"
                 style={{
                   boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                 }}>
              {/* Decorative corner elements */}
              <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
              
              <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[350px]">
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={getCharacterPortraitPath(character.name)}
                    alt={`${character.name} portrait`}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      // Show placeholder if portrait doesn't exist
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-[#f6ecd6] border-2 border-dashed border-[#bfa76a] rounded-lg">
                            <div class="text-center">
                              <div class="text-[#6b3e26] font-serif text-lg mb-2">No Portrait Available</div>
                              <div class="text-[#4b3a1e] font-serif text-sm">Portrait will be added later</div>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
                {/* Art Credit */}
                {thisBlock.artcredit && (
                  <div className="absolute bottom-0 left-0 right-0 text-center">
                    <div className="bg-[#fff8e1] bg-opacity-90 px-2 py-1 rounded text-xs text-[#4b3a1e] font-serif">
                      Art: {safeString(thisBlock.artcredit)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 