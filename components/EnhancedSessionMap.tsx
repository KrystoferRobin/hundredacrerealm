'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getTileImageUrl } from '@/lib/tile-image';
import { getCharacterMapIconUrl } from '@/lib/character-map-icon';
import {
  COUNTER_GRAPHICS_STYLE_LABELS,
  DEFAULT_COUNTER_GRAPHICS_STYLE,
  DEFAULT_TILE_GRAPHICS_STYLE,
  TILE_GRAPHICS_STYLE_LABELS,
  type CounterGraphicsStyle,
  type TileGraphicsStyle,
} from '@/lib/map-graphics-styles';
import {
  MapChitMarkers,
  MapChitClearingPopup,
  type ClearingPopupState,
} from '@/components/MapChitOverlays';
import {
  buildMapContentTransform,
  computeMapBounds,
  filterInPlayTiles,
  getClearingOffsetInTile,
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

interface CharacterPosition {
  character: string;
  tile: string;
  clearing: string;
  isDead: boolean;
  opacity: number;
  step: number;
  totalSteps: number;
}

interface CharacterMovementPath {
  character: string;
  positions: Array<{
    tile: string;
    clearing: string;
    step: number;
    opacity: number;
  }>;
  lines: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    opacity: number;
  }>;
}

interface SessionMapProps {
  sessionId: string;
  characterIcons?: CharacterPosition[];
  showCharacterIcons?: boolean;
  selectedDay?: string;
  isAutoAdvancing?: boolean;
  sessionData?: any;
}

const EnhancedSessionMap: React.FC<SessionMapProps> = ({ 
  sessionId, 
  characterIcons = [], 
  showCharacterIcons = true, 
  selectedDay,
  isAutoAdvancing = false,
  sessionData
}) => {
  
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
  const [characterPaths, setCharacterPaths] = useState<CharacterMovementPath[]>([]);
  
  // Overlay toggles
  const [tileStyle, setTileStyle] = useState<TileGraphicsStyle>(DEFAULT_TILE_GRAPHICS_STYLE);
  const [counterStyle, setCounterStyle] = useState<CounterGraphicsStyle>(DEFAULT_COUNTER_GRAPHICS_STYLE);
  const [showDwellings, setShowDwellings] = useState(true);
  const [showSound, setShowSound] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showTreasure, setShowTreasure] = useState(false);
  const [showNatives, setShowNatives] = useState(true);
  const [showMonsters, setShowMonsters] = useState(true);
  const [showOtherChits, setShowOtherChits] = useState(false);
  const [showLivingCharacters, setShowLivingCharacters] = useState(true);
  const [showDeadCharacters, setShowDeadCharacters] = useState(true);
  const [mapLocations, setMapLocations] = useState<any>(null);
  const [chitPopup, setChitPopup] = useState<ClearingPopupState | null>(null);

  // Parse enhanced actions to extract movement paths
  const parseCharacterPaths = (dayData: any) => {
    if (!dayData || !dayData.characterTurns) return [];
    
    const paths: CharacterMovementPath[] = [];
    
    dayData.characterTurns.forEach((turn: any) => {
      const actions = turn.enhancedActions || turn.actions;
      if (!actions || actions.length === 0) return;
      
      const positions: Array<{
        tile: string;
        clearing: string;
        step: number;
        opacity: number;
      }> = [];
      
      const lines: Array<{
        from: { x: number; y: number };
        to: { x: number; y: number };
        opacity: number;
      }> = [];
      
      let currentLocation = turn.startLocation;
      let step = 0;
      
      // Parse start location
      const startLocation = parseLocation(currentLocation);
      positions.push({
        tile: startLocation.tileName,
        clearing: startLocation.clearing,
        step: 0,
        opacity: 0.5 // Start at 50% opacity
      });
      
      // Parse each action
      actions.forEach((action: any, actionIndex: number) => {
        const actionText = action.action;
        
        // Check if this is a move action
        if (actionText.startsWith('Moved to ')) {
          const match = actionText.match(/Moved to (.+?) (\d+)/);
          if (match) {
            const tileName = match[1];
            const clearing = match[2];
            step++;
            
            // Add position with increasing opacity
            const opacity = 0.5 + (step / (actions.length + 1)) * 0.5; // 50% to 100%
            positions.push({
              tile: tileName,
              clearing,
              step,
              opacity
            });
            
            // Add line from previous position
            if (positions.length > 1) {
              const prevPos = positions[positions.length - 2];
              lines.push({
                from: { x: 0, y: 0 }, // Will be calculated later
                to: { x: 0, y: 0 }, // Will be calculated later
                opacity: prevPos.opacity
              });
            }
          }
        }
      });
      
      if (positions.length > 0) {
        paths.push({
          character: turn.character,
          positions,
          lines
        });
      }
    });
    
    return paths;
  };

  // Calculate positions for lines
  const calculateLinePositions = (paths: CharacterMovementPath[]) => {
    return paths.map(path => {
      const updatedLines = path.lines.map((line, index) => {
        const fromPos = path.positions[index];
        const toPos = path.positions[index + 1];
        
        if (!fromPos || !toPos) return line;
        
        // Find tiles and calculate positions
        const fromTile = mapData?.tiles.find((t: Tile) => t.objectName === fromPos.tile);
        const toTile = mapData?.tiles.find((t: Tile) => t.objectName === toPos.tile);
        
        if (!fromTile || !toTile) return line;
        
        const fromHexPos = getHexPosition(...parsePosition(fromTile.position));
        const toHexPos = getHexPosition(...parsePosition(toTile.position));
        
        const fromClearingPos = getClearingPosition(fromTile, fromPos.clearing);
        const toClearingPos = getClearingPosition(toTile, toPos.clearing);
        
        if (!fromClearingPos || !toClearingPos) return line;
        
        // Apply tile rotation
        const fromRotation = getTileRotation(fromTile.rotation);
        const toRotation = getTileRotation(toTile.rotation);
        
        const fromRad = (fromRotation * Math.PI) / 180;
        const toRad = (toRotation * Math.PI) / 180;
        
        const fromRotatedX = fromClearingPos.x * Math.cos(fromRad) - fromClearingPos.y * Math.sin(fromRad);
        const fromRotatedY = fromClearingPos.x * Math.sin(fromRad) + fromClearingPos.y * Math.cos(fromRad);
        const toRotatedX = toClearingPos.x * Math.cos(toRad) - toClearingPos.y * Math.sin(toRad);
        const toRotatedY = toClearingPos.x * Math.sin(toRad) + toClearingPos.y * Math.cos(toRad);
        
        return {
          from: { 
            x: fromHexPos.x + fromRotatedX, 
            y: fromHexPos.y + fromRotatedY 
          },
          to: { 
            x: toHexPos.x + toRotatedX, 
            y: toHexPos.y + toRotatedY 
          },
          opacity: fromPos.opacity
        };
      });
      
      return {
        ...path,
        lines: updatedLines
      };
    });
  };

  // Clear character paths immediately when selectedDay changes
  useEffect(() => {
    setCharacterPaths([]);
  }, [selectedDay]);

  // Update character paths when day changes
  useEffect(() => {
    
    if (!sessionData || !selectedDay) {
      setCharacterPaths([]);
      return;
    }
    
    const dayData = sessionData.days[selectedDay];
    if (!dayData) {
      setCharacterPaths([]);
      return;
    }
    
    // Use detailed movement data from map state if available
    if (dynamicMapState && dynamicMapState.detailedMovement) {
      const paths: CharacterMovementPath[] = [];
      Object.entries(dynamicMapState.detailedMovement).forEach(([character, movementData]: [string, any]) => {
        if (movementData.movementPath && movementData.hasEnhancedData) {
          const positions: Array<{ tile: string; clearing: string; step: number; opacity: number; }> = [];
          const lines: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; opacity: number; }> = [];
          // Start with startLocation if available
          const charPos = dynamicMapState.characterPositions[character];
          let step = 0;
          if (charPos && charPos.startLocation) {
            const match = charPos.startLocation.match(/^(.+?) (\d+)$/);
            if (match) {
              positions.push({
                tile: match[1],
                clearing: match[2],
                step: step++,
                opacity: 0.5
              });
            }
          }
          // Add each movement step
          movementData.movementPath.forEach((location: string, index: number) => {
            const match = location.match(/^(.+?) (\d+)$/);
            if (match) {
              positions.push({
                tile: match[1],
                clearing: match[2],
                step: step++,
                opacity: 0.5 + (step / (movementData.movementPath.length + 1)) * 0.5
              });
            }
          });
          // Optionally, add endLocation if not already last
          if (charPos && charPos.endLocation) {
            const match = charPos.endLocation.match(/^(.+?) (\d+)$/);
            if (match) {
              const last = positions[positions.length - 1];
              if (!last || last.tile !== match[1] || last.clearing !== match[2]) {
                positions.push({
                  tile: match[1],
                  clearing: match[2],
                  step: step++,
                  opacity: 1
                });
              }
            }
          }
          // Add lines between each step
          for (let i = 1; i < positions.length; i++) {
            lines.push({
              from: { x: 0, y: 0 },
              to: { x: 0, y: 0 },
              opacity: positions[i - 1].opacity
            });
          }
          if (positions.length > 0) {
            paths.push({ character, positions, lines });
          }
        }
      });
      // Calculate line positions if map data is available
      if (mapData && paths.length > 0) {
        const updatedPaths = calculateLinePositions(paths);
        setCharacterPaths(updatedPaths);
      } else {
        setCharacterPaths(paths);
      }
    } else {
      // Fallback to parsing from session data
      const paths = parseCharacterPaths(dayData);
      if (mapData && paths.length > 0) {
        const updatedPaths = calculateLinePositions(paths);
        setCharacterPaths(updatedPaths);
      } else {
        setCharacterPaths(paths);
      }
    }
  }, [sessionData, selectedDay, dynamicMapState, mapData]);

  // Calculate line positions when map data changes (fallback for when map data loads after character paths)
  useEffect(() => {
    if (mapData && characterPaths.length > 0) {
      const updatedPaths = calculateLinePositions(characterPaths);
      setCharacterPaths(updatedPaths);
    }
  }, [mapData]); // Only depend on mapData, not characterPaths

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

  // Effect to check container ref and force resize calculation
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    } else {
      // Try again after a short delay
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
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

  const parsePosition = (position: string): [number, number] => {
    const { x, y } = parseMapPosition(position);
    return [x, y];
  };

  const getHexPosition = (q: number, r: number) => gridToPixel(q, r, MAP_DIMS);

  const getTileImage = (tile: Tile): string =>
    getTileImageUrl(tile, tileDataCache, tileStyle);

  const getTileRotation = (rotation: number): number => tileRotationDegrees(rotation);

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

  const parseLocation = (location: string): { tileName: string; clearing: string } => {
    const match = location.match(/^(.+?) (\d+)$/);
    if (match) {
      return {
        tileName: match[1],
        clearing: match[2]
      };
    }
    return {
      tileName: location,
      clearing: ''
    };
  };

  const getClearingPosition = (tile: Tile, clearing: string): { x: number; y: number } | null => {
    const tileData = tileDataCache[tile.objectName];
    if (!tileData) return null;
    return getClearingOffsetInTile(clearing, tileData, tile.isEnchanted, MAP_DIMS);
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
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-red-600">Error: {error}</div>;
  }

  if (!mapData) {
    return <div className="w-full h-full flex items-center justify-center">No map data available</div>;
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
        <label className="block text-xs mb-1">
          Tile style
          <select
            className="block w-full mt-0.5 border rounded text-xs"
            value={tileStyle}
            onChange={(e) => setTileStyle(e.target.value as TileGraphicsStyle)}
          >
            {(Object.keys(TILE_GRAPHICS_STYLE_LABELS) as TileGraphicsStyle[]).map((key) => (
              <option key={key} value={key}>
                {TILE_GRAPHICS_STYLE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs mb-2">
          Counter style
          <select
            className="block w-full mt-0.5 border rounded text-xs"
            value={counterStyle}
            onChange={(e) => setCounterStyle(e.target.value as CounterGraphicsStyle)}
          >
            {(Object.keys(COUNTER_GRAPHICS_STYLE_LABELS) as CounterGraphicsStyle[]).map((key) => (
              <option key={key} value={key}>
                {COUNTER_GRAPHICS_STYLE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showDwellings} onChange={e => setShowDwellings(e.target.checked)} /> Dwellings</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showNatives} onChange={e => setShowNatives(e.target.checked)} /> Natives</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showMonsters} onChange={e => setShowMonsters(e.target.checked)} /> Monsters</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showSound} onChange={e => setShowSound(e.target.checked)} /> Sound</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showWarning} onChange={e => setShowWarning(e.target.checked)} /> Warning</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showTreasure} onChange={e => setShowTreasure(e.target.checked)} /> Treasure</label>
        <label className="block text-xs mb-1"><input type="checkbox" checked={showOtherChits} onChange={e => setShowOtherChits(e.target.checked)} /> Other chits</label>
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
          <g
            transform={contentTransform}
            style={{ transition: zoom === 1 && pan.x === 0 && pan.y === 0 ? undefined : 'transform 0.1s' }}
          >
          {/* Render tiles */}
          {activeTiles.map((tile: Tile, index: number) => {
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            const imageUrl = getTileImage(tile);
            const rotation = getTileRotation(tile.rotation);

            return (
              <g key={index}>
                {/* Tile image */}
                <image
                  href={imageUrl}
                  x={hexPos.x - hexWidth / 2}
                  y={hexPos.y - hexHeight / 2}
                  width={hexWidth}
                  height={hexHeight}
                  transform={`rotate(${rotation} ${hexPos.x} ${hexPos.y})`}
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => {
                    console.warn(`Missing tile image: ${imageUrl} for tile: ${tile.objectName}`);
                    const target = e.target as SVGImageElement;
                    target.style.display = 'none';
                  }}
                />
              </g>
            );
          })}

          {/* Character movement paths and icons */}
          {characterPaths.map((path, pathIndex) => {
            // Always show all positions and lines (no stepping)
            const visiblePositions = path.positions;
            const visibleLines = path.lines;

            return (
              <g key={`path-${pathIndex}`}>
                {/* Render movement lines */}
                {visibleLines.map((line, lineIndex) => (
                  <g key={`line-${lineIndex}`}>
                    {/* Main line */}
                    <line
                      x1={line.from.x}
                      y1={line.from.y}
                      x2={line.to.x}
                      y2={line.to.y}
                      stroke="#FF6B35"
                      strokeWidth="3"
                      opacity={line.opacity}
                      strokeDasharray="5,5"
                      style={{
                        animation: 'march 1s linear infinite'
                      }}
                    />
                    {/* Glow effect */}
                    <line
                      x1={line.from.x}
                      y1={line.from.y}
                      x2={line.to.x}
                      y2={line.to.y}
                      stroke="#FFD700"
                      strokeWidth="6"
                      opacity={line.opacity * 0.3}
                      strokeDasharray="5,5"
                      style={{
                        animation: 'march 1s linear infinite'
                      }}
                    />
                  </g>
                ))}

                {/* Render character positions */}
                {visiblePositions.map((pos, posIndex) => {
                  const tile = mapData.tiles.find((t: Tile) => t.objectName === pos.tile);
                  if (!tile) return null;

                  const [x, y] = parsePosition(tile.position);
                  const hexPos = getHexPosition(x, y);
                  const clearingPos = getClearingPosition(tile, pos.clearing);
                  if (!clearingPos) return null;

                  const rotation = getTileRotation(tile.rotation);
                  const rad = (rotation * Math.PI) / 180;
                  const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
                  const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
                  const px = hexPos.x + rotatedX;
                  const py = hexPos.y + rotatedY;

                  const iconSize = 13;

                  // Check if character is in combat at this position
                  const isInCombat = dynamicMapState?.battles?.some((battle: any) => {
                    const { tileName, clearing } = parseLocation(battle.location);
                    return tileName === pos.tile && clearing === pos.clearing;
                  }) || false;

                  // Check if character is hidden by looking at their enhanced actions
                  const isHidden = (() => {
                    if (!sessionData || !selectedDay) return false;
                    const dayData = sessionData.days[selectedDay];
                    if (!dayData) return false;
                    
                    // Find the character's turn for this day
                    const characterTurn = dayData.characterTurns.find((turn: any) => turn.character === path.character);
                    if (!characterTurn || !characterTurn.enhancedActions) return false;
                    
                    // Find the index of the hide action
                    const hideActionIndex = characterTurn.enhancedActions.findIndex((action: any) => 
                      action.action === 'Hide' && action.result === 'Success'
                    );
                    
                    if (hideActionIndex === -1) return false; // No hide action
                    
                    // Check if this position occurs after the hide action
                    // For movement positions, the step index corresponds to the action index
                    if (pos.step > hideActionIndex) return true;
                    
                    // If this is the last position and they hid after their last move, show as hidden
                    const isLastPosition = pos.step === path.positions.length - 1;
                    const isLastAction = hideActionIndex === characterTurn.enhancedActions.length - 1;
                    
                    return isLastPosition && isLastAction;
                  })();

                  const iconUrl = getCharacterMapIconUrl(path.character, counterStyle, {
                    hidden: isHidden,
                  });

                  return (
                    <g key={`pos-${posIndex}`}>
                      {/* Background circle */}
                      <circle
                        cx={px}
                        cy={py}
                        r={iconSize / 2 + 2}
                        fill={isHidden ? "#000000" : "#ffffff"}
                        stroke={isInCombat ? "#ff0000" : "#000000"}
                        strokeWidth={isInCombat ? "2" : "1"}
                        opacity={pos.opacity}
                      />
                      {/* Character icon */}
                      <image
                        href={iconUrl}
                        x={px - iconSize/2}
                        y={py - iconSize/2}
                        width={iconSize}
                        height={iconSize}
                        opacity={pos.opacity}
                        style={{ 
                          filter: isHidden ? 'invert(1) brightness(1.2) contrast(1.3)' : 'brightness(1.2) contrast(1.3)' 
                        }}
                        onError={(e) => {
                          console.error(`Failed to load character icon: ${iconUrl}`);
                          const target = e.target as SVGImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      {/* Step indicator */}
                      <text
                        x={px + iconSize/2 + 2}
                        y={py + 4}
                        fontSize="10"
                        fill="#FF6B35"
                        fontWeight="bold"
                        opacity={pos.opacity}
                      >
                        {pos.step}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Character Icon Overlay (with toggles for living/dead) */}
          {(showCharacterIcons && characterIcons.length > 0 && characterPaths.length === 0) && (
            <g className="character-icon-overlay">
              {(() => {
                const locationGroups: Record<string, CharacterPosition[]> = {};
                characterIcons.forEach(icon => {
                  if ((icon.isDead && showDeadCharacters) || (!icon.isDead && showLivingCharacters)) {
                    const key = `${icon.tile}-${icon.clearing}`;
                    if (!locationGroups[key]) locationGroups[key] = [];
                    locationGroups[key].push(icon);
                  }
                });
                return Object.entries(locationGroups).map(([locationKey, icons]) => {
                  const firstIcon = icons[0];
                  const tileIdx = mapData.tiles.findIndex((t: Tile) => t.objectName === firstIcon.tile);
                  if (tileIdx === -1) return null;
                  const tile = mapData.tiles[tileIdx];
                  const [x, y] = parsePosition(tile.position);
                  const hexPos = getHexPosition(x, y);
                  const clearingPos = getClearingPosition(tile, firstIcon.clearing);
                  if (!clearingPos) return null;
                  
                  // Apply tile rotation to clearing position
                  const rotation = getTileRotation(tile.rotation);
                  const rad = (rotation * Math.PI) / 180;
                  const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
                  const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
                  
                  // Base position: tile center + rotated clearing offset
                  const baseX = hexPos.x + rotatedX;
                  const baseY = hexPos.y + rotatedY;
                  
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
                    
                    // Check if character is in combat at this position
                    const isInCombat = dynamicMapState?.battles?.some((battle: any) => {
                      const { tileName, clearing } = parseLocation(battle.location);
                      return tileName === icon.tile && clearing === icon.clearing;
                    }) || false;

                    // Check if character is hidden by looking at their enhanced actions
                    const isHidden = (() => {
                      if (!sessionData || !selectedDay) return false;
                      const dayData = sessionData.days[selectedDay];
                      if (!dayData) return false;
                      
                      // Find the character's turn for this day
                      const characterTurn = dayData.characterTurns.find((turn: any) => turn.character === icon.character);
                      if (!characterTurn || !characterTurn.enhancedActions) return false;
                      
                      // Find the index of the hide action
                      const hideActionIndex = characterTurn.enhancedActions.findIndex((action: any) => 
                        action.action === 'Hide' && action.result === 'Success'
                      );
                      
                      if (hideActionIndex === -1) return false; // No hide action
                      
                      // For static icons, we show hidden if they hid at any point during their turn
                      // since static icons represent the final position
                      return true;
                    })();

                    const iconUrl = getCharacterMapIconUrl(icon.character, counterStyle, {
                      hidden: isHidden,
                    });
                    
                    return (
                      <g key={icon.character}>
                        {/* Background circle for better visibility */}
                        <circle
                          cx={px}
                          cy={py}
                          r={iconSize / 2 + 2}
                          fill={icon.isDead ? "#2d1b1b" : (isHidden ? "#000000" : "#ffffff")}
                          stroke={icon.isDead ? "#8b0000" : (isInCombat ? "#ff0000" : "#000000")}
                          strokeWidth={icon.isDead ? "1" : (isInCombat ? "2" : "1")}
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
                            filter: icon.isDead ? 'brightness(1.2) contrast(1.3)' : 
                                   (isHidden ? 'invert(1) brightness(1.2) contrast(1.3)' : 'brightness(1.2) contrast(1.3)')
                          }}
                          onError={(e) => {
                            console.error(`Failed to load character icon: ${iconUrl}`);
                            const target = e.target as SVGImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        
                        <title>{icon.character} at {icon.tile} clearing {icon.clearing}</title>
                      </g>
                    );
                  });
                });
              })()}
            </g>
          )}

          {/* Dynamic Character Positions - only show when there are no character paths */}
          {dynamicMapState && dynamicMapState.characterPositions && characterPaths.length === 0 && Object.entries(dynamicMapState.characterPositions).map(([character, position]: [string, any]) => {
            const { tileName, clearing } = parseLocation(position.endLocation);
            const tileIdx = (dynamicMapState.tiles || mapData.tiles).findIndex((t: Tile) => t.objectName === tileName);
            if (tileIdx === -1) return null;
            const tile = (dynamicMapState.tiles || mapData.tiles)[tileIdx];
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            const clearingPos = clearing ? getClearingPosition(tile, clearing) : { x: 0, y: 0 };
            if (!clearingPos) return null;
            
            const rotation = getTileRotation(tile.rotation);
            const rad = (rotation * Math.PI) / 180;
            const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
            const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
            const px = hexPos.x + rotatedX;
            const py = hexPos.y + rotatedY;
            
            const iconSize = 13;
            
            // Check if character is in combat at this position
            const isInCombat = dynamicMapState?.battles?.some((battle: any) => {
              const { tileName: battleTile, clearing: battleClearing } = parseLocation(battle.location);
              return battleTile === tileName && battleClearing === clearing;
            }) || false;

            // Check if character is hidden by looking at their enhanced actions
            const isHidden = (() => {
              if (!sessionData || !selectedDay) return false;
              const dayData = sessionData.days[selectedDay];
              if (!dayData) return false;
              
              // Find the character's turn for this day
              const characterTurn = dayData.characterTurns.find((turn: any) => turn.character === character);
              if (!characterTurn || !characterTurn.enhancedActions) return false;
              
              // Find the index of the hide action
              const hideActionIndex = characterTurn.enhancedActions.findIndex((action: any) => 
                action.action === 'Hide' && action.result === 'Success'
              );
              
              if (hideActionIndex === -1) return false; // No hide action
              
              // For dynamic positions, we show hidden if they hid at any point during their turn
              // since dynamic positions represent the final position
              return true;
            })();

            const iconUrl = getCharacterMapIconUrl(character, counterStyle, { hidden: isHidden });
            
            return (
              <g key={`dynamic-${character}`} className="dynamic-character">
                <circle
                  cx={px}
                  cy={py}
                  r={iconSize / 2 + 2}
                  fill={isHidden ? "#000000" : "#ffffff"}
                  stroke={isInCombat ? "#ff0000" : "#000000"}
                  strokeWidth={isInCombat ? "2" : "1"}
                  opacity="0.9"
                />
                <image
                  href={iconUrl}
                  x={px - iconSize/2}
                  y={py - iconSize/2}
                  width={iconSize}
                  height={iconSize}
                  style={{ 
                    filter: isHidden ? 'invert(1) brightness(1.2) contrast(1.3)' : 'brightness(1.2) contrast(1.3)' 
                  }}
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

          {mapLocations && (
            <MapChitMarkers
              mapLocations={mapLocations}
              mapData={mapData}
              tileDataCache={tileDataCache}
              dims={MAP_DIMS}
              counterStyle={counterStyle}
              showDwellings={showDwellings}
              showSound={showSound}
              showWarning={showWarning}
              showTreasure={showTreasure}
              showNatives={showNatives}
              showMonsters={showMonsters}
              showOther={showOtherChits}
              onClearingPopup={setChitPopup}
            />
          )}
          </g>
        </svg>
      </div>

      {mapLocations && (
        <MapChitClearingPopup
          popup={chitPopup}
          overlayRootRef={containerRef}
          counterStyle={counterStyle}
        />
      )}
      
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
          <button
            onClick={fitMapToDisplay}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
          >
            Fit to Display
          </button>
        </div>
      </div>

      {/* CSS for marching ants animation */}
      <style jsx>{`
        @keyframes march {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -10; }
        }
      `}</style>
    </div>
  );
};

export default EnhancedSessionMap; 