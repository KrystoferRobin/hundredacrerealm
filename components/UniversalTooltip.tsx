"use client";
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CounterTooltipPanel } from '@/components/CounterTooltipPanel';
import {
  isGameItemRecord,
  isMonsterRecord,
  isNativeRecord,
  type ItemLikeRecord,
} from '@/lib/denizen-detect';

interface TooltipProps {
  type: 'item' | 'spell' | 'character' | 'monster' | 'native';
  name: string;
  category?: string; // For items: 'armor', 'treasure', 'weapon'
  level?: string; // For spells: 'I', 'II', etc.
  children: React.ReactNode;
  className?: string;
}

interface TooltipData {
  id: string;
  name: string;
  type?: string;
  level?: string;
  description?: string;
  image?: string;
  denizenKind?: 'native' | 'monster';
  parts?: TooltipData[];
  attributeBlocks: Record<string, any>;
}

export default function UniversalTooltip({ 
  type, 
  name, 
  category, 
  level, 
  children, 
  className = "" 
}: TooltipProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMouseEnter = async (event: React.MouseEvent) => {
    // Use cursor position directly for accurate tooltip placement
    setPosition({ 
      x: event.clientX, 
      y: event.clientY 
    });
    setShowTooltip(true);

    if (!tooltipData && !loading) {
      setLoading(true);
      try {
        const response = await fetch('/api/tooltip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            name,
            category,
            level
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setTooltipData(result.data);
        }
      } catch (error) {
        console.error('Error fetching tooltip data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (showTooltip) {
      // Use cursor position relative to viewport for more responsive positioning
      setPosition({ 
        x: event.clientX, 
        y: event.clientY 
      });
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const renderTooltipContent = () => {
    if (loading) {
      return (
        <div className="p-2 text-sm text-[#6b3e26] font-serif">
          Loading...
        </div>
      );
    }

    if (!tooltipData) {
      return (
        <div className="p-2 text-sm text-[#6b3e26] font-serif">
          No data available
        </div>
      );
    }

    if (
      type === 'item' ||
      type === 'spell' ||
      isGameItemRecord(tooltipData as ItemLikeRecord) ||
      type === 'native' ||
      type === 'monster' ||
      isNativeRecord(tooltipData) ||
      isMonsterRecord(tooltipData) ||
      tooltipData.attributeBlocks
    ) {
      return <CounterTooltipPanel item={tooltipData as ItemLikeRecord} />;
    }

    return (
      <div className="p-2 text-sm text-[#6b3e26] font-serif">
        No data available
      </div>
    );
  };

  return (
    <div 
      className={`cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && position && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div 
          className="fixed z-[9999] bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg shadow-lg"
          style={{
            left: Math.min(position.x + 10, window.innerWidth - 320),
            top: Math.min(position.y + 10, window.innerHeight - 200),
            maxWidth: '360px',
            pointerEvents: 'none'
          }}
        >
          {renderTooltipContent()}
        </div>,
        document.body
      )}
    </div>
  );
} 