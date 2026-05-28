"use client";
import { useState, useEffect } from 'react';

interface Native {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      native: string;
      fame: string;
      notoriety: string;
      base_price: string;
      vulnerability: string;
      armored?: string;
      rank: string;
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
}

interface NativeGroup {
  dwelling: string;
  displayName: string;
  natives: Native[];
}

export default function NativesPage() {
  const [nativeGroups, setNativeGroups] = useState<NativeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNatives = async () => {
      try {
        const response = await fetch('/api/natives');
        if (!response.ok) {
          throw new Error('Failed to fetch natives');
        }
        const data = await response.json();
        setNativeGroups(data.nativeGroups || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load natives');
      } finally {
        setLoading(false);
      }
    };

    fetchNatives();
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
      'forestgreen': '#228B22'
    };
    return colorMap[colorName] || '#FFFFFF';
  };

  // Function to check if two natives have different stats
  const hasDifferentStats = (native1: Native, native2: Native): boolean => {
    const this1 = native1.attributeBlocks.this;
    const this2 = native2.attributeBlocks.this;
    const light1 = native1.attributeBlocks.light;
    const light2 = native2.attributeBlocks.light;
    const dark1 = native1.attributeBlocks.dark;
    const dark2 = native2.attributeBlocks.dark;

    return (
      this1.fame !== this2.fame ||
      this1.notoriety !== this2.notoriety ||
      this1.base_price !== this2.base_price ||
      this1.vulnerability !== this2.vulnerability ||
      light1.move_speed !== light2.move_speed ||
      light1.attack_speed !== light2.attack_speed ||
      light1.strength !== light2.strength ||
      dark1.move_speed !== dark2.move_speed ||
      dark1.attack_speed !== dark2.attack_speed ||
      dark1.strength !== dark2.strength
    );
  };

  // Function to sort and filter natives
  const processNatives = (natives: Native[]): Native[] => {
    // Sort: HQ first, then numbered
    const sorted = natives.sort((a, b) => {
      const aIsHQ = a.name.includes('HQ');
      const bIsHQ = b.name.includes('HQ');
      
      if (aIsHQ && !bIsHQ) return -1;
      if (!aIsHQ && bIsHQ) return 1;
      
      // If both are HQ or both are numbered, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Filter duplicates unless stats differ
    const filtered: Native[] = [];
    const seen = new Set<string>();

    for (const native of sorted) {
      const key = native.attributeBlocks.this.native + '_' + native.attributeBlocks.this.rank;
      
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(native);
      } else {
        // Check if this native has different stats than the one we already have
        const existing = filtered.find(n => 
          n.attributeBlocks.this.native === native.attributeBlocks.this.native &&
          n.attributeBlocks.this.rank === native.attributeBlocks.this.rank
        );
        
        if (existing && hasDifferentStats(native, existing)) {
          filtered.push(native);
        }
      }
    }

    return filtered;
  };

  // Function to render a native chit
  const renderNativeChit = (native: Native, side: 'light' | 'dark') => {
    const sideData = native.attributeBlocks[side];
    const thisData = native.attributeBlocks.this;
    const backgroundColor = getChitColor(sideData.chit_color);
    const isArmored = thisData.armored !== undefined;

    return (
      <div 
        key={`${native.id}-${side}`}
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
        
        {/* Combined Strength + Attack speed (bottom center, black text on red square) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#FF0000] text-black text-xs font-bold px-1 rounded">
            {sideData.strength}{sideData.attack_speed}
          </div>
        </div>
        
        {/* Move speed (bottom right, black text on green square) */}
        <div className="absolute bottom-0 right-0">
          <div className="bg-[#00FF00] text-black text-xs font-bold px-1 rounded">
            {sideData.move_speed}
          </div>
        </div>
      </div>
    );
  };

  // Function to render a native group
  const renderNativeGroup = (group: NativeGroup) => {
    return (
      <div key={group.dwelling} className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative overflow-hidden group"
           style={{
             boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
           }}>
        {/* Decorative corner elements */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
        
        {/* Group Title */}
        <h3 className="text-xl font-bold mb-4 text-[#6b3e26] font-serif text-center">
          {group.displayName}
        </h3>
        
        {/* Natives Grid - 2 columns, 2 natives per row */}
        <div className="grid grid-cols-2 gap-4">
          {processNatives(group.natives).map((native) => (
            <div key={native.id} className="space-y-2">
              {/* Native Name */}
              <div className="text-sm font-semibold text-[#6b3e26] font-serif text-center">
                {native.name}
              </div>
              {/* Light and Dark chits side by side */}
              <div className="flex justify-center space-x-2">
                {renderNativeChit(native, 'light')}
                {renderNativeChit(native, 'dark')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Natives...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Error Loading Natives</div>
          <div className="text-[#6b3e26] font-serif">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{minHeight: '100vh'}}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          {/* Natives Grid - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {nativeGroups.map(renderNativeGroup)}
          </div>

          {/* Summary */}
          <div className="text-center mt-8">
            <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-4 inline-block">
              <p className="text-[#6b3e26] font-serif">
                <span className="font-bold">{nativeGroups.length}</span> native groups available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 