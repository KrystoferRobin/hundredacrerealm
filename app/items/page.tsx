"use client";
import { useState, useEffect } from 'react';
import UniversalTooltip from '../../components/UniversalTooltip';

interface Item {
  id: string;
  name: string;
  type: string;
  description?: string;
  image?: string;
  attributeBlocks: Record<string, any>;
}

interface ItemGroup {
  category: string;
  displayName: string;
  items: Item[];
}

export default function ItemsPage() {
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await response.json();
        setItemGroups(data.itemGroups || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load items');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Remove old popover logic - now using UniversalTooltip

  const renderItemCard = (item: Item) => {
    const isTreasure = item.type === 'treasure';
    const isLargeTreasure = isTreasure && item.attributeBlocks.this?.size === 'large';
    
    return (
      <UniversalTooltip
        type="item"
        name={item.name}
        category={item.type}
        className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
          isTreasure 
            ? 'bg-[#fff8e1] border-[#bfa76a] hover:bg-[#f3e3b2] hover:scale-105' 
            : 'bg-[#f6ecd6] border-[#bfa76a]'
        }`}
      >
        {/* Gold bubble for large treasures */}
        {isLargeTreasure && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-xs font-bold text-black shadow-lg">
            💰
          </div>
        )}
        
        <div className="text-center">
          <h4 className="font-semibold text-[#6b3e26] font-serif text-sm mb-2">
            {item.name}
          </h4>
          
          {/* Item image if available */}
          {item.image && (
            <div className="flex justify-center mb-2">
              <img 
                src={item.image} 
                alt={item.name}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Item type badge */}
          <div className="inline-block bg-[#bfa76a] text-[#6b3e26] text-xs px-2 py-1 rounded font-serif">
            {item.type}
          </div>
        </div>
      </UniversalTooltip>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Items...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Error Loading Items</div>
          <div className="text-[#6b3e26] font-serif">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] font-serif">
      {/* Header */}
      <div className="bg-[#6b3e26] text-[#f6ecd6] py-6 shadow-lg border-b-4 border-[#bfa76a] relative">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#bfa76a] via-[#fff8e1] to-[#bfa76a]"></div>
        
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide drop-shadow-lg font-serif text-[#fff8e1] relative text-center">
            <span className="relative z-10">Items of the Hundred Acre Realm</span>
            <div className="absolute inset-0 bg-[#bfa76a] opacity-20 blur-sm rounded-lg"></div>
          </h1>
          <p className="text-sm text-[#bfa76a] mt-2 font-serif italic text-center">
            Weapons, armor, and treasures found throughout the realm
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {itemGroups.length === 0 ? (
          <div className="text-center text-[#4b3a1e] font-serif italic">
            No items available
          </div>
        ) : (
          <div className="space-y-8">
            {itemGroups.map((group) => (
              <div key={group.category} className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative"
                   style={{
                     boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                   }}>
                {/* Decorative corner elements */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
                
                <h2 className="text-2xl font-bold text-[#6b3e26] font-serif mb-6 text-center">
                  {group.displayName}
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {group.items.map(renderItemCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item tooltips now handled by UniversalTooltip component */}
    </div>
  );
} 