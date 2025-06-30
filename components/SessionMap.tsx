'use client';

import React, { useState, useEffect } from 'react';

interface Tile {
  position: string;
  rotation: number;
  tileType: string | null;
  tileName: string | null;
  image: string | null;
  objectName: string;
  isEnchanted: boolean;
}

interface SessionMapProps {
  sessionId: string;
}

const SessionMap: React.FC<SessionMapProps> = ({ sessionId }) => {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/map`);
        if (!response.ok) {
          throw new Error('Failed to load map data');
        }
        const data = await response.json();
        setMapData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [sessionId]);

  // Convert position string to coordinates
  const parsePosition = (position: string): [number, number] => {
    const [x, y] = position.split(',').map(Number);
    return [x, y];
  };

  // Calculate hex grid position using standard axial hex grid formula
  const getHexPosition = (x: number, y: number) => {
    const hexSize = 60;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const pixelX = x * (hexWidth * 0.75);
    const pixelY = y * hexHeight + x * (hexHeight / 2);
    return { x: pixelX, y: pixelY };
  };

  // Get tile image filename
  const getTileImage = (tile: Tile): string => {
    // Map tile names to image filenames
    const tileNameMap: Record<string, string> = {
      'Caves': 'caves',
      'Ledges': 'ledges',
      'Cavern': 'cavern',
      'Awful Valley': 'awfulvalley',
      'Oak Woods': 'oakwoods',
      'Linden Woods': 'lindenwoods',
      'Deep Woods': 'deepwoods',
      'Ruins': 'ruins',
      'Bad Valley': 'badvalley',
      'Mountain': 'mountain',
      'Evil Valley': 'evilvalley',
      'Borderland': 'borderland',
      'Cliff': 'cliff',
      'Curst Valley': 'curstvalley',
      'Dark Valley': 'darkvalley',
      'Pine Woods': 'pinewoods',
      'High Pass': 'highpass',
      'Crag': 'crag',
      'Maple Woods': 'maplewoods',
      'Nut Woods': 'nutwoods'
    };
    
    const baseName = tileNameMap[tile.objectName] || tile.objectName.toLowerCase().replace(/\s+/g, '');
    const suffix = tile.isEnchanted ? '-e1' : '1';
    const filename = `${baseName}${suffix}.gif`;
    const imageUrl = `/api/tiles/${filename}`;
    console.log(`Generated image URL for ${tile.objectName}: ${imageUrl}`);
    return imageUrl;
  };

  // Apply rotation to tile
  const getTileRotation = (rotation: number): number => {
    // Convert game rotation (0-5) to CSS rotation degrees
    // Each rotation step is 60 degrees
    return rotation * 60;
  };

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

  if (loading) {
    return <div className="text-center p-4">Loading map...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  }

  if (!mapData || !mapData.tiles) {
    return <div className="text-center p-4">No map data available</div>;
  }

  // Calculate map bounds
  const positions = mapData.tiles.map((tile: Tile) => parsePosition(tile.position));
  const minX = Math.min(...positions.map(([x, y]: [number, number]) => x));
  const maxX = Math.max(...positions.map(([x, y]: [number, number]) => x));
  const minY = Math.min(...positions.map(([x, y]: [number, number]) => y));
  const maxY = Math.max(...positions.map(([x, y]: [number, number]) => y));

  // Calculate map dimensions
  const hexSize = 60; // Base hex size (not zoomed)
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);
  const mapWidth = (maxX - minX + 1) * (hexWidth * 0.75) + hexWidth / 2;
  const mapHeight = (maxY - minY + 1) * hexHeight + hexHeight / 2;

  // Calculate pixel positions for all tiles
  const tilePixelPositions = mapData.tiles.map((tile: Tile) => {
    const [x, y] = parsePosition(tile.position);
    return getHexPosition(x, y);
  });
  const minPixelX = Math.min(...tilePixelPositions.map(pos => pos.x));
  const minPixelY = Math.min(...tilePixelPositions.map(pos => pos.y));

  return (
    <div 
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative'
      }}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
          className="block w-8 h-8 mb-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.1, 0.3))}
          className="block w-8 h-8 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          -
        </button>
      </div>

      {/* SVG is a direct child, pan/zoom applied here */}
      <svg
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        style={{
          display: 'block',
          background: 'none',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'top left',
          transition: 'transform 0.1s',
          overflow: 'visible',
        }}
      >
        {/* Render tiles */}
        {mapData.tiles.map((tile: Tile, index: number) => {
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
                  console.error(`Failed to load image: ${imageUrl}`);
                  console.error('Image error details:', e);
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
      </svg>
    </div>
  );
};

export default SessionMap;