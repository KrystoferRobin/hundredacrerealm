'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  const [zoom, setZoom] = useState(1.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });
  const [tileDataCache, setTileDataCache] = useState<Record<string, any>>({});
  const [characterPaths, setCharacterPaths] = useState<CharacterMovementPath[]>([]);
  
  // Overlay toggles
  const [showDwellings, setShowDwellings] = useState(true);
  const [showSound, setShowSound] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showTreasure, setShowTreasure] = useState(true);
  const [showLivingCharacters, setShowLivingCharacters] = useState(true);
  const [showDeadCharacters, setShowDeadCharacters] = useState(true);
  const [mapLocations, setMapLocations] = useState<any>(null);

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
    
    // Try to use detailed movement data from map state if available
    if (dynamicMapState && dynamicMapState.detailedMovement) {
      const paths: CharacterMovementPath[] = [];
      
      Object.entries(dynamicMapState.detailedMovement).forEach(([character, movementData]: [string, any]) => {
        if (movementData.movementPath && movementData.hasEnhancedData) {
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
          
          // Parse each location in the movement path
          movementData.movementPath.forEach((location: string, index: number) => {
            const match = location.match(/^(.+?) (\d+)$/);
            if (match) {
              const tileName = match[1];
              const clearing = match[2];
              const step = index;
              const opacity = 0.5 + (step / (movementData.movementPath.length - 1)) * 0.5; // 50% to 100%
              
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
          });
          
          if (positions.length > 0) {
            paths.push({
              character,
              positions,
              lines
            });
          }
        }
      });
      
      // Calculate line positions immediately if map data is available
      if (mapData && paths.length > 0) {
        const updatedPaths = calculateLinePositions(paths);
        setCharacterPaths(updatedPaths);
      } else {
        setCharacterPaths(paths);
      }
    } else {
      // Fall back to parsing from session data
      const paths = parseCharacterPaths(dayData);
      // Calculate line positions immediately if map data is available
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

  // Calculate the true center of the map using all clearing positions
  const calculateMapCenter = () => {
    if (!mapData || !tileDataCache) return { x: 0, y: 0 };
    
    const allClearingPositions: { x: number; y: number }[] = [];
    
    // Only consider tiles that are actually in play (not void spaces)
    const actualTiles = mapData.tiles.filter((tile: Tile) => tile.objectName && tile.objectName !== 'undefined');
    
    // Collect all clearing positions from actual tiles
    actualTiles.forEach((tile: Tile) => {
      const tileData = tileDataCache[tile.objectName];
      if (!tileData) {
        return;
      }
      
      const block = tile.isEnchanted ? tileData.attributeBlocks.enchanted : tileData.attributeBlocks.normal;
      if (!block) {
        return;
      }
      
      // Get all clearing coordinates for this tile
      Object.keys(block).forEach(key => {
        if (key.startsWith('clearing_') && key.endsWith('_xy')) {
          const coords = block[key];
          if (coords) {
            const [xPercent, yPercent] = coords.split(',').map(Number);
            
            // Convert to pixel coordinates within the hex
            const hexSize = 60;
            const hexWidth = hexSize * 2;
            const hexHeight = hexSize * Math.sqrt(3);
            
            // Scale from 100x100 to hex dimensions
            const clearingX = (xPercent / 100) * hexWidth - hexWidth / 2;
            const clearingY = (yPercent / 100) * hexHeight - hexHeight / 2;
            
            // Get tile position
            const [tileX, tileY] = parsePosition(tile.position);
            const hexPos = getHexPosition(tileX, tileY);
            
            // Apply tile rotation
            const rotation = getTileRotation(tile.rotation);
            const rad = (rotation * Math.PI) / 180;
            const rotatedX = clearingX * Math.cos(rad) - clearingY * Math.sin(rad);
            const rotatedY = clearingX * Math.sin(rad) + clearingY * Math.cos(rad);
            
            // Add to collection
            allClearingPositions.push({
              x: hexPos.x + rotatedX,
              y: hexPos.y + rotatedY
            });
          }
        }
      });
    });
    
    // Calculate center of all clearing positions
    if (allClearingPositions.length > 0) {
      const avgX = allClearingPositions.reduce((sum, pos) => sum + pos.x, 0) / allClearingPositions.length;
      const avgY = allClearingPositions.reduce((sum, pos) => sum + pos.y, 0) / allClearingPositions.length;
      return { x: avgX, y: avgY };
    }
    
    // Fallback to tile centers if no clearing data
    const tilePixelPositions = actualTiles.map((tile: Tile) => {
      const [x, y] = parsePosition(tile.position);
      return getHexPosition(x, y);
    });
    
    if (tilePixelPositions.length > 0) {
      const avgX = tilePixelPositions.reduce((sum, pos) => sum + pos.x, 0) / tilePixelPositions.length;
      const avgY = tilePixelPositions.reduce((sum, pos) => sum + pos.y, 0) / tilePixelPositions.length;
      return { x: avgX, y: avgY };
    }
    
    return { x: 0, y: 0 };
  };

  // Calculate SVG dimensions dynamically based on actual tiles
  const calculateDynamicSVGDimensions = () => {
    if (!mapData || !mapData.tiles) {
      return {
        width: 120, // Single hex width
        height: 104, // Single hex height
        viewBox: '0 0 120 104',
        minPixelX: 0,
        minPixelY: 0,
        maxPixelX: 120,
        maxPixelY: 104
      };
    }

    const hexSize = 60;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const PAD_X = hexWidth / 2;
    const PAD_Y = hexHeight / 2;

    // Only consider tiles that are actually in play (not void spaces)
    const actualTiles = mapData.tiles.filter((tile: Tile) => {
      const isValid = tile.objectName && tile.objectName !== 'undefined' && tile.objectName.trim() !== '';
      return isValid;
    });

    if (actualTiles.length === 0) {
      return {
        width: hexWidth,
        height: hexHeight,
        viewBox: `${-PAD_X} ${-PAD_Y} ${hexWidth + 2 * PAD_X} ${hexHeight + 2 * PAD_Y}`,
        minPixelX: -PAD_X,
        minPixelY: -PAD_Y,
        maxPixelX: hexWidth + PAD_X,
        maxPixelY: hexHeight + PAD_Y
      };
    }

    // Calculate pixel positions for actual tiles only
    const tilePixelPositions = actualTiles.map((tile: Tile) => {
      const [x, y] = parsePosition(tile.position);
      return getHexPosition(x, y);
    });

    const minPixelX = Math.min(...tilePixelPositions.map(pos => pos.x));
    const minPixelY = Math.min(...tilePixelPositions.map(pos => pos.y));
    const maxPixelX = Math.max(...tilePixelPositions.map(pos => pos.x));
    const maxPixelY = Math.max(...tilePixelPositions.map(pos => pos.y));

    const svgWidth = (maxPixelX - minPixelX) + hexWidth + 2 * PAD_X;
    const svgHeight = (maxPixelY - minPixelY) + hexHeight + 2 * PAD_Y;
    const viewBox = `${minPixelX - PAD_X} ${minPixelY - PAD_Y} ${svgWidth} ${svgHeight}`;

    return {
      width: svgWidth,
      height: svgHeight,
      viewBox,
      minPixelX: minPixelX - PAD_X,
      minPixelY: minPixelY - PAD_Y,
      maxPixelX: maxPixelX + PAD_X,
      maxPixelY: maxPixelY + PAD_Y
    };
  };

  // Calculate optimal zoom to fit map in display area
  const calculateOptimalZoom = () => {
    const hexSize = 60;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    if (!mapData || containerSize.width === 0 || containerSize.height === 0) return 1;
    
    // Get actual tile positions (not SVG bounds)
    const actualTiles = mapData.tiles.filter((tile: Tile) => {
      const isValid = tile.objectName && tile.objectName !== 'undefined' && tile.objectName.trim() !== '';
      return isValid;
    });
    
    if (actualTiles.length === 0) return 1;
    
    // Calculate the actual bounds of the hex grid
    const tilePositions = actualTiles.map((tile: Tile) => {
      const [x, y] = parsePosition(tile.position);
      return getHexPosition(x, y);
    });
    
    const minX = Math.min(...tilePositions.map(pos => pos.x));
    const maxX = Math.max(...tilePositions.map(pos => pos.x));
    const minY = Math.min(...tilePositions.map(pos => pos.y));
    const maxY = Math.max(...tilePositions.map(pos => pos.y));
    
    const mapWidth = maxX - minX + hexWidth;
    const mapHeight = maxY - minY + hexHeight;
    
    // Calculate zoom to fit with padding
    const padding = 0.1; // 10% padding for better visual spacing
    const zoomX = (containerSize.width * (1 - padding)) / mapWidth;
    const zoomY = (containerSize.height * (1 - padding)) / mapHeight;
    
    // Use the smaller zoom to ensure the entire map fits
    const optimalZoom = Math.min(zoomX, zoomY, 3); // Cap at 3x zoom
    const finalZoom = Math.max(optimalZoom, 0.5); // Minimum 0.5x zoom
    
    console.log('Improved zoom calculation:', {
      mapWidth,
      mapHeight,
      containerSize,
      zoomX,
      zoomY,
      optimalZoom,
      finalZoom
    });
    
    return finalZoom;
  };

  // Handle zoom slider change
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
  };

  // Effect to center map on initial load with improved centering
  useEffect(() => {
    if (
      mapData &&
      containerSize.width > 0 &&
      containerSize.height > 0 &&
      Object.keys(tileDataCache).length > 0
    ) {
      // Use SVG viewBox center for pan calculation
      const svgDimensions = calculateDynamicSVGDimensions();
      const viewBoxParts = svgDimensions.viewBox.split(' ').map(Number);
      const viewBoxX = viewBoxParts[0];
      const viewBoxY = viewBoxParts[1];
      const viewBoxWidth = viewBoxParts[2];
      const viewBoxHeight = viewBoxParts[3];
      const centerX = viewBoxX + viewBoxWidth / 2;
      const centerY = viewBoxY + viewBoxHeight / 2;
      setPan({
        x: containerSize.width / 2 - centerX * zoom,
        y: containerSize.height / 2 - centerY * zoom
      });
      console.log('SVG viewBox centering:', {
        viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, centerX, centerY, zoom,
        pan: {
          x: containerSize.width / 2 - centerX * zoom,
          y: containerSize.height / 2 - centerY * zoom
        }
      });
    }
  }, [mapData, containerSize, tileDataCache, zoom]);



  const parsePosition = (position: string): [number, number] => {
    const [x, y] = position.split(',').map(Number);
    return [x, y];
  };

  const getHexPosition = (x: number, y: number) => {
    const hexSize = 60;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const PAD_X = hexWidth / 2;
    const PAD_Y = hexHeight / 2;
    
    return {
      x: x * (hexWidth * 0.75) + PAD_X,
      y: y * hexHeight + (x % 2) * (hexHeight / 2) + PAD_Y
    };
  };

  const getTileImage = (tile: Tile): string => {
    // Get the tile data to find the correct image name
    const tileData = tileDataCache[tile.objectName];
    let baseName: string;
    
    if (tileData && tileData.attributeBlocks?.this?.image) {
      // Use the image field from the tile data if available
      baseName = tileData.attributeBlocks.this.image;
    } else {
      // Fallback to converting tile name to lowercase, replace spaces with nothing
      baseName = tile.objectName.toLowerCase().replace(/\s+/g, '');
    }
    
    const suffix = tile.isEnchanted ? '-e1' : '1';
    const filename = `${baseName}${suffix}.gif`;
    const imageUrl = `/images/tiles/${filename}`;
    
    console.log(`Generated image URL for ${tile.objectName}: ${imageUrl}`);
    return imageUrl;
  };

  const getTileRotation = (rotation: number): number => {
    return rotation * 60; // Convert to degrees
  };

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
    
    // Get the appropriate attribute block (normal or enchanted)
    const block = tile.isEnchanted ? tileData.attributeBlocks.enchanted : tileData.attributeBlocks.normal;
    if (!block) return null;
    
    // Get clearing coordinates (e.g., "clearing_4_xy": "33.0,84.3")
    const clearingKey = `clearing_${clearing}_xy`;
    const coords = block[clearingKey];
    if (!coords) return null;
    
    // Parse coordinates (percentage of 100x100 tile)
    const [xPercent, yPercent] = coords.split(',').map(Number);
    
    // Convert to pixel coordinates within the hex
    const hexSize = 60;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    
    // Scale from 100x100 to hex dimensions
    const x = (xPercent / 100) * hexWidth - hexWidth / 2;
    const y = (yPercent / 100) * hexHeight - hexHeight / 2;
    
    return { x, y };
  };

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-red-600">Error: {error}</div>;
  }

  if (!mapData) {
    return <div className="w-full h-full flex items-center justify-center">No map data available</div>;
  }

  // Calculate dynamic SVG dimensions
  const svgDimensions = calculateDynamicSVGDimensions();
  
  // Define hex dimensions for rendering
  const hexSize = 60;
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);

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
        </div>
      </div>

      {/* SVG container with proper overflow handling */}
      <div className="w-full h-full overflow-hidden">
        <svg
          width={svgDimensions.width}
          height={svgDimensions.height}
          viewBox={svgDimensions.viewBox}
          style={{
            display: 'block',
            background: 'none',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.1s',
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        >
          {/* Render tiles */}
          {(dynamicMapState ? dynamicMapState.tiles : mapData.tiles).map((tile: Tile, index: number) => {
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
                  onLoad={() => {
                    console.log(`Successfully loaded image: ${imageUrl}`);
                  }}
                />
              </g>
            );
          })}

          {/* Dwellings Overlay */}
          {showDwellings && mapLocations && mapLocations.dwellings.map((item: any, idx: number) => {
            const tileIdx = mapData.tiles.findIndex((t: Tile) => t.objectName === item.tile);
            if (tileIdx === -1) return null;
            const tile = mapData.tiles[tileIdx];
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            const clearingPos = item.clearing ? getClearingPosition(tile, item.clearing) : { x: 0, y: 0 };
            if (!clearingPos) return null;
            const rotation = getTileRotation(tile.rotation);
            const rad = (rotation * Math.PI) / 180;
            const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
            const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
            const px = hexPos.x + rotatedX;
            const py = hexPos.y + rotatedY;
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
            const tileIdx = mapData.tiles.findIndex((t: Tile) => t.objectName === item.tile);
            if (tileIdx === -1) return null;
            const tile = mapData.tiles[tileIdx];
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            const clearingPos = item.clearing ? getClearingPosition(tile, item.clearing) : { x: 0, y: 0 };
            if (!clearingPos) return null;
            const rotation = getTileRotation(tile.rotation);
            const rad = (rotation * Math.PI) / 180;
            const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
            const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
            const px = hexPos.x + rotatedX;
            const py = hexPos.y + rotatedY;
            return (
              <g key={idx} className="sound-overlay">
                <circle cx={px} cy={py} r={10} fill="#e0f7fa" stroke="#00796b" strokeWidth={2} />
                <text x={px} y={py+5} textAnchor="middle" fontSize={12} fill="#00796b" fontWeight="bold">🔊</text>
                <title>{item.name} ({item.tile}{item.clearing ? ` clearing ${item.clearing}` : ''})</title>
              </g>
            );
          })}

          {/* Warning Overlay */}
          {showWarning && mapLocations && mapLocations.warning.map((item: any, idx: number) => {
            const tileIdx = mapData.tiles.findIndex((t: Tile) => t.objectName === item.tile);
            if (tileIdx === -1) return null;
            const tile = mapData.tiles[tileIdx];
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            
            // Get tile data to find clear areas
            const tileData = tileDataCache[tile.objectName];
            let px = hexPos.x;
            let py = hexPos.y;
            
            if (tileData) {
              const block = tile.isEnchanted ? tileData.attributeBlocks.enchanted : tileData.attributeBlocks.normal;
              if (block && block.offroad_xy) {
                // Use offroad coordinates as a reference point for clear areas
                const [offroadXPercent, offroadYPercent] = block.offroad_xy.split(',').map(Number);
                
                // Convert to pixel coordinates within the hex
                const hexSize = 60;
                const hexWidth = hexSize * 2;
                const hexHeight = hexSize * Math.sqrt(3);
                
                // Scale from 100x100 to hex dimensions
                const offroadX = (offroadXPercent / 100) * hexWidth - hexWidth / 2;
                const offroadY = (offroadYPercent / 100) * hexHeight - hexHeight / 2;
                
                // Apply tile rotation
                const rotation = getTileRotation(tile.rotation);
                const rad = (rotation * Math.PI) / 180;
                const rotatedX = offroadX * Math.cos(rad) - offroadY * Math.sin(rad);
                const rotatedY = offroadX * Math.sin(rad) + offroadY * Math.cos(rad);
                
                px = hexPos.x + rotatedX;
                py = hexPos.y + rotatedY;
              }
            }
            
            // Make warning chits 40% smaller (15 * 0.6 = 9)
            const radius = 9;
            const fontSize = 8; // Reduced from 14
            
            return (
              <g key={idx} className="warning-overlay">
                <circle cx={px} cy={py} r={radius} fill="#fff3e0" stroke="#f57c00" strokeWidth={2} />
                <text x={px} y={py+3} textAnchor="middle" fontSize={fontSize} fill="#f57c00" fontWeight="bold">⚠️</text>
                <title>{item.name} ({item.tile})</title>
              </g>
            );
          })}

          {/* Treasure Overlay */}
          {showTreasure && mapLocations && mapLocations.treasure.map((item: any, idx: number) => {
            const tileIdx = mapData.tiles.findIndex((t: Tile) => t.objectName === item.tile);
            if (tileIdx === -1) return null;
            const tile = mapData.tiles[tileIdx];
            const [x, y] = parsePosition(tile.position);
            const hexPos = getHexPosition(x, y);
            const clearingPos = item.clearing ? getClearingPosition(tile, item.clearing) : { x: 0, y: 0 };
            if (!clearingPos) return null;
            const rotation = getTileRotation(tile.rotation);
            const rad = (rotation * Math.PI) / 180;
            const rotatedX = clearingPos.x * Math.cos(rad) - clearingPos.y * Math.sin(rad);
            const rotatedY = clearingPos.x * Math.sin(rad) + clearingPos.y * Math.cos(rad);
            const px = hexPos.x + rotatedX;
            const py = hexPos.y + rotatedY;
            return (
              <g key={idx} className="treasure-overlay">
                <circle cx={px} cy={py} r={10} fill="#fff3e0" stroke="#ff8f00" strokeWidth={2} />
                <text x={px} y={py+5} textAnchor="middle" fontSize={12} fill="#ff8f00" fontWeight="bold">💰</text>
                <title>{item.name} ({item.tile}{item.clearing ? ` clearing ${item.clearing}` : ''})</title>
              </g>
            );
          })}

          {/* Character movement paths and icons - rendered last so they're on top */}
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

                  const iconUrl = `/images/charsymbol/${path.character}_symbol.png`;
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
                    
                    const iconUrl = `/images/charsymbol/${icon.character}_symbol.png`;
                    
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
            
            const iconUrl = `/images/charsymbol/${character}_symbol.png`;
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