'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getTileImageUrl } from '@/lib/tile-image';
import {
  buildMapContentTransform,
  computeMapBounds,
  filterInPlayTiles,
  findTileByName,
  getChitPixelOnMap,
  getTilePixelDimensions,
  gridToPixel,
  parseMapPosition,
  tileRotationDegrees,
} from '@/lib/map-geometry';

const MAP_DIMS = getTilePixelDimensions();

interface Tile {
  position: string;
  rotation: number;
  tileType: string | null;
  tileName: string | null;
  image: string | null;
  objectName: string;
  isEnchanted: boolean;
}

interface CharacterMapIcon {
  character: string;
  tile: string;
  clearing: string;
  isDead: boolean;
}

interface SessionMapProps {
  sessionId: string;
  characterIcons?: CharacterMapIcon[];
  showCharacterIcons?: boolean;
  selectedDay?: string; // New prop for dynamic map state
}

const SessionMap: React.FC<SessionMapProps> = ({ sessionId, characterIcons = [], showCharacterIcons = true, selectedDay }) => {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicMapState, setDynamicMapState] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });
  const [tileDataCache, setTileDataCache] = useState<Record<string, any>>({});
  // Overlay toggles
  const [showDwellings, setShowDwellings] = useState(true);
  const [showSound, setShowSound] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showTreasure, setShowTreasure] = useState(true);
  const [showLivingCharacters, setShowLivingCharacters] = useState(true);
  const [showDeadCharacters, setShowDeadCharacters] = useState(true);
  const [mapLocations, setMapLocations] = useState<any>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/map`);
        if (!response.ok) {
          throw new Error('Failed to load map data');
        }
        const data = await response.json();
        setMapData(data);
        // Pre-load tile data for all tiles
        const tileData: Record<string, any> = {};
        for (const tile of data.tiles) {
          try {
            const tileResponse = await fetch(`/api/tiles/${tile.objectName.replace(/\s+/g, '_')}`);
            if (tileResponse.ok) {
              tileData[tile.objectName] = await tileResponse.json();
            }
          } catch (err) {
            console.warn(`Failed to load tile data for ${tile.objectName}:`, err);
          }
        }
        setTileDataCache(tileData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [sessionId]);

  // Load tile data for dynamic map state tiles
  useEffect(() => {
    const loadDynamicTileData = async () => {
      if (!dynamicMapState || !dynamicMapState.tiles) return;
      
      const newTileData: Record<string, any> = {};
      for (const tile of dynamicMapState.tiles) {
        // Only load if not already in cache
        if (!tileDataCache[tile.objectName]) {
          try {
            const tileResponse = await fetch(`/api/tiles/${tile.objectName.replace(/\s+/g, '_')}`);
            if (tileResponse.ok) {
              newTileData[tile.objectName] = await tileResponse.json();
            }
          } catch (err) {
            console.warn(`Failed to load tile data for ${tile.objectName}:`, err);
          }
        }
      }
      
      if (Object.keys(newTileData).length > 0) {
        setTileDataCache(prev => ({ ...prev, ...newTileData }));
      }
    };

    loadDynamicTileData();
  }, [dynamicMapState, tileDataCache]);

  // Load dynamic map state when selectedDay changes
  useEffect(() => {
    const loadDynamicMapState = async () => {
      if (!selectedDay) {
        setDynamicMapState(null);
        return;
      }

      try {
        const response = await fetch(`/api/session/${sessionId}/map-state/${selectedDay}`);
        if (!response.ok) {
          console.warn(`Failed to load map state for day ${selectedDay}`);
          setDynamicMapState(null);
          return;
        }
        const data = await response.json();
        setDynamicMapState(data);
      } catch (err) {
        console.warn(`Error loading map state for day ${selectedDay}:`, err);
        setDynamicMapState(null);
      }
    };

    loadDynamicMapState();
  }, [sessionId, selectedDay]);

  useEffect(() => {
    // Load map_locations.json dynamically
    const fetchLocations = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/map-locations`);
        if (res.ok) {
          const data = await res.json();
          setMapLocations(data);
        }
      } catch (e) {
        console.warn('Failed to load map locations:', e);
        setMapLocations({}); // fallback to empty object
      }
    };
    fetchLocations();
  }, [sessionId]);

  // ResizeObserver to track container size
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    handleResize(); // Initial
    const observer = new (window as any).ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fitMapToDisplay = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle zoom slider change
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
  };

  useEffect(() => {
    if (mapData && Object.keys(tileDataCache).length > 0) {
      fitMapToDisplay();
    }
  }, [mapData, tileDataCache, dynamicMapState]);

  const getTileImage = (tile: Tile): string =>
    getTileImageUrl(tile, tileDataCache);

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Helper function to parse location strings with spaces in tile names
  const parseLocation = (location: string): { tileName: string; clearing: string } => {
    // Find the last number in the string (the clearing number)
    const match = location.match(/^(.*?)\s+(\d+)$/);
    if (match) {
      return {
        tileName: match[1].trim(),
        clearing: match[2]
      };
    }
    // Fallback: if no number found, assume it's just a tile name
    return {
      tileName: location.trim(),
      clearing: ''
    };
  };

  const activeTiles = useMemo(() => {
    if (!mapData?.tiles) return [] as Tile[];
    const tiles = (dynamicMapState?.tiles ?? mapData.tiles) as Tile[];
    return filterInPlayTiles(tiles);
  }, [dynamicMapState, mapData]);

  const mapBounds = useMemo(
    () => computeMapBounds(activeTiles, MAP_DIMS),
    [activeTiles]
  );

  const contentTransform = buildMapContentTransform(mapBounds, zoom, pan);

  if (loading) {
    return <div className="text-center p-4">Loading map...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  }

  if (!mapData || !mapData.tiles) {
    return <div className="text-center p-4">No map data available</div>;
  }

  const { width: hexWidth, height: hexHeight } = MAP_DIMS;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Zoom Controls & Overlay Toggles */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 min-w-[180px]">
        <div className="mb-2 font-bold">Map Overlays</div>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showDwellings} onChange={e => setShowDwellings(e.target.checked)} /> Dwellings</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showSound} onChange={e => setShowSound(e.target.checked)} /> Sound</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showWarning} onChange={e => setShowWarning(e.target.checked)} /> Warning</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showTreasure} onChange={e => setShowTreasure(e.target.checked)} /> Treasure/Other</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showLivingCharacters} onChange={e => setShowLivingCharacters(e.target.checked)} /> Living Characters</label>
        <label className="block text-xs mb-2"><input type="checkbox" checked={showDeadCharacters} onChange={e => setShowDeadCharacters(e.target.checked)} /> Dead Characters</label>
        {/* Zoom controls */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1">Zoom: {Math.round(zoom * 100)}%</div>
          <button
            onClick={fitMapToDisplay}
            className="block w-full mb-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs py-1"
            title="Fit to Display"
          >
            Fit to Display
          </button>
        </div>
      </div>

      {/* SVG container with proper overflow handling */}
      <div className="w-full h-full overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox={mapBounds.viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: 'none' }}
        >
        <g transform={contentTransform}>
        {/* Render tiles */}
        {activeTiles.map((tile: Tile, index: number) => {
          const { x, y } = parseMapPosition(tile.position);
          const hexPos = gridToPixel(x, y, MAP_DIMS);
          const imageUrl = getTileImage(tile);
          const rotation = tileRotationDegrees(tile.rotation);

          return (
            <g key={index}>
              <image
                href={imageUrl}
                x={hexPos.x - hexWidth / 2}
                y={hexPos.y - hexHeight / 2}
                width={hexWidth}
                height={hexHeight}
                transform={`rotate(${rotation} ${hexPos.x} ${hexPos.y})`}
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => {
                  const target = e.target as SVGImageElement;
                  target.style.display = 'none';
                }}
              />
            </g>
          );
        })}
        {/* Dwellings Overlay */}
        {showDwellings && mapLocations && mapLocations.dwellings.map((item: any, idx: number) => {
          const tile = findTileByName(mapData.tiles, item.tile);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, item, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;
          return (
            <g key={idx} className="dwelling-overlay">
              <rect x={px-10} y={py-10} width={20} height={20} fill="#ffe4b5" stroke="#b8860b" strokeWidth={2} rx={4} />
              <text x={px} y={py+5} textAnchor="middle" fontSize={12} fill="#b8860b" fontWeight="bold">🏠</text>
              <title>{item.name} ({item.tile}{item.clearing ? ` clearing ${item.clearing}` : ''})</title>
            </g>
          );
        })}
        {/* Sound Overlay */}
        {showSound && mapLocations && mapLocations.sound.map((item: any, idx: number) => {
          const tile = findTileByName(mapData.tiles, item.tile);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, item, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;
          return (
            <g key={idx} className="sound-overlay">
              <circle cx={px} cy={py} r={10} fill="#e0f7fa" stroke="#00796b" strokeWidth={2} />
              <text x={px} y={py+5} textAnchor="middle" fontSize={12} fill="#00796b" fontWeight="bold">🔊</text>
              <title>{item.name} ({item.tile}{item.clearing ? ` clearing ${item.clearing}` : ''})</title>
            </g>
          );
        })}
        {/* Warning Overlay */}
        {showWarning && mapLocations && mapLocations.warning
          .filter((item: any) => !item.dwelling)
          .map((item: any, idx: number) => {
          const tile = findTileByName(mapData.tiles, item.tile);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, item, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;
          const size = 7;
          const fontSize = 8; // Reduced from 14
          
          return (
            <g key={idx} className="warning-overlay">
              <rect x={px-size} y={py-size} width={size*2} height={size*2} fill="#fff3cd" stroke="#856404" strokeWidth={2} rx={3} />
              <text x={px} y={py+3} textAnchor="middle" fontSize={fontSize} fill="#856404" fontWeight="bold">⚠️</text>
              <title>{item.name} ({item.tile})</title>
            </g>
          );
        })}
        {/* Treasure/Other Overlay */}
        {showTreasure && mapLocations && [...mapLocations.treasure, ...mapLocations.other].map((item: any, idx: number) => {
          const tile = findTileByName(mapData.tiles, item.tile);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, item, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;
          return (
            <g key={idx} className="treasure-overlay">
              <circle cx={px} cy={py} r={9} fill="#fffde7" stroke="#ffd600" strokeWidth={2} />
              <text x={px} y={py+5} textAnchor="middle" fontSize={12} fill="#ffd600" fontWeight="bold">💰</text>
              <title>{item.name} ({item.tile}{item.clearing ? ` clearing ${item.clearing}` : ''})</title>
            </g>
          );
        })}
        {/* Combat Indicators */}
        {dynamicMapState && dynamicMapState.battles && dynamicMapState.battles.map((battle: any, idx: number) => {
          const { tileName, clearing } = parseLocation(battle.location);
          const tile = findTileByName(dynamicMapState.tiles || mapData.tiles, tileName);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, { clearing }, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;

          return (
            <g key={`battle-${idx}`} className="combat-indicator">
              <circle cx={px} cy={py} r={12} fill="#ffebee" stroke="#d32f2f" strokeWidth={2} />
              <text x={px} y={py+4} textAnchor="middle" fontSize={14} fill="#d32f2f" fontWeight="bold">⚔️</text>
              <title>Combat at {battle.location}</title>
            </g>
          );
        })}
        
        {/* Dynamic Character Positions */}
        {dynamicMapState && dynamicMapState.characterPositions && Object.entries(dynamicMapState.characterPositions).map(([character, position]: [string, any]) => {
          const { tileName, clearing } = parseLocation(position.endLocation);
          const tile = findTileByName(dynamicMapState.tiles || mapData.tiles, tileName);
          if (!tile) return null;
          const pos = getChitPixelOnMap(tile, { clearing }, tileDataCache, MAP_DIMS);
          if (!pos) return null;
          const { x: px, y: py } = pos;

          const iconUrl = `/images/charsymbol/${character}_symbol.png`;
          const iconSize = 13;
          
          return (
            <g key={`dynamic-${character}`} className="dynamic-character">
              <circle
                cx={px}
                cy={py}
                r={iconSize / 2 + 2}
                fill="#ffffff"
                stroke="#000000"
                strokeWidth="1"
                opacity="0.9"
              />
              <image
                href={iconUrl}
                x={px - iconSize/2}
                y={py - iconSize/2}
                width={iconSize}
                height={iconSize}
                style={{ filter: 'brightness(1.2) contrast(1.3)' }}
                onError={(e) => {
                  console.error(`Failed to load character icon: ${iconUrl}`);
                  const target = e.target as SVGImageElement;
                  target.style.display = 'none';
                }}
              />
              <title>{character} at {position.endLocation}</title>
            </g>
          );
        })}
        
        {/* Character Icon Overlay (with toggles for living/dead) */}
        {(showCharacterIcons && characterIcons.length > 0 && !dynamicMapState) && (
          <g className="character-icon-overlay">
            {(() => {
              const locationGroups: Record<string, CharacterMapIcon[]> = {};
              characterIcons.forEach(icon => {
                if ((icon.isDead && showDeadCharacters) || (!icon.isDead && showLivingCharacters)) {
                  const key = `${icon.tile}-${icon.clearing}`;
                  if (!locationGroups[key]) locationGroups[key] = [];
                  locationGroups[key].push(icon);
                }
              });
              return Object.entries(locationGroups).map(([locationKey, icons]) => {
                const firstIcon = icons[0];
                const tile = findTileByName(mapData.tiles, firstIcon.tile);
                if (!tile) return null;
                const basePos = getChitPixelOnMap(
                  tile,
                  { clearing: firstIcon.clearing },
                  tileDataCache,
                  MAP_DIMS
                );
                if (!basePos) return null;
                const baseX = basePos.x;
                const baseY = basePos.y;
                
                // Arrange multiple icons in a circle around the clearing
                const iconSize = 13; // Half size (26 * 0.5)
                const spacing = iconSize * 0.8; // Much closer spacing
                
                return icons.map((icon, idx) => {
                  let px, py;
                  if (icons.length === 1) {
                    px = baseX;
                    py = baseY;
                  } else {
                    // Arrange in a circle around the clearing
                    const angle = (idx / icons.length) * 2 * Math.PI;
                    const radius = spacing * 0.6; // Even tighter clustering
                    px = baseX + Math.cos(angle) * radius;
                    py = baseY + Math.sin(angle) * radius;
                  }
                  
                  const iconUrl = `/images/charsymbol/${icon.character}_symbol.png`;
                  
                  console.log(`Loading character icon: ${icon.character} -> ${iconUrl}, dead=${icon.isDead}`);
                  
                  return (
                    <g key={icon.character}>
                      {/* Background circle for better visibility */}
                      <circle
                        cx={px}
                        cy={py}
                        r={iconSize / 2 + 2}
                        fill={icon.isDead ? "#2d1b1b" : "#ffffff"}
                        stroke={icon.isDead ? "#8b0000" : "#000000"}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      
                      {icon.isDead && (
                        <g>
                          {/* Headstone frame */}
                          <rect
                            x={px - iconSize/2 - 4}
                            y={py - iconSize/2 - 4}
                            width={iconSize + 8}
                            height={iconSize + 8}
                            rx="4"
                            fill="#4a4a4a"
                            stroke="#8b0000"
                            strokeWidth="2"
                            opacity="0.8"
                          />
                          {/* Cross on headstone */}
                          <line
                            x1={px - 2}
                            y1={py - 6}
                            x2={px + 2}
                            y2={py + 6}
                            stroke="#8b0000"
                            strokeWidth="1"
                          />
                          <line
                            x1={px - 6}
                            y1={py}
                            x2={px + 6}
                            y2={py}
                            stroke="#8b0000"
                            strokeWidth="1"
                          />
                        </g>
                      )}
                      
                      <image
                        href={iconUrl}
                        x={px - iconSize/2}
                        y={py - iconSize/2}
                        width={iconSize}
                        height={iconSize}
                        style={{
                          filter: icon.isDead ? 'grayscale(1) brightness(0.5) saturate(0.5) hue-rotate(0deg)' : 'brightness(1.2) contrast(1.3)',
                        }}
                        onError={(e) => {
                          console.error(`Failed to load character icon: ${iconUrl}`);
                          const target = e.target as SVGImageElement;
                          target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log(`Successfully loaded character icon: ${iconUrl}`);
                        }}
                      />
                    </g>
                  );
                });
              }).flat();
            })()}
          </g>
        )}
        </g>
        </svg>
      </div>
      
      {/* Zoom Slider at the bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Zoom</span>
            <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="3"
            step="0.1"
            value={zoom}
            onChange={handleZoomChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom - 0.3) / 2.7) * 100}%, #e5e7eb ${((zoom - 0.3) / 2.7) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30%</span>
            <span>100%</span>
            <span>300%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionMap;