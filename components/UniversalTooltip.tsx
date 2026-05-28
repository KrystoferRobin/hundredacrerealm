"use client";
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

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

    return (
      <div className="p-3 max-w-sm">
        <h3 className="font-bold text-[#6b3e26] font-serif mb-2">{tooltipData.name}</h3>
        
        {tooltipData.level && (
          <div className="text-xs text-[#6b3e26] font-serif mb-2">
            Level {tooltipData.level}
          </div>
        )}
        
        {tooltipData.type && (
          <div className="text-xs text-[#6b3e26] font-serif mb-2">
            Type: {tooltipData.type}
          </div>
        )}
        
        {tooltipData.description && (
          <p className="text-sm text-[#4b3a1e] font-serif mb-2">{tooltipData.description}</p>
        )}
        
        {tooltipData.image && (
          <div className="flex justify-center mb-2">
            <img 
              src={tooltipData.image} 
              alt={tooltipData.name}
              className="w-16 h-16 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {tooltipData.attributeBlocks.this && (
          <div className="text-xs text-[#6b3e26] font-serif">
            {Object.entries(tooltipData.attributeBlocks.this).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-semibold">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
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
            maxWidth: '300px',
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