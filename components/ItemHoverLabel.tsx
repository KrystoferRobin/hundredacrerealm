'use client';

import { useEffect, useState } from 'react';
import { CounterTooltipPanel } from './CounterTooltipPanel';

interface ItemHoverLabelProps {
  name: string;
  className?: string;
}

export function ItemHoverLabel({ name, className = '' }: ItemHoverLabelProps) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/items/${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setItem(data?.item ?? null);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <span className={`relative group inline-block cursor-help underline decoration-dotted decoration-[#bfa76a] ${className}`}>
      {name}
      <span className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[120] whitespace-normal">
        {item ? (
          <CounterTooltipPanel item={item} />
        ) : loading ? (
          <span className="block bg-[#fff8e1] border border-[#bfa76a] rounded px-2 py-1 text-[10px] font-serif text-[#6b3e26] shadow-lg">
            Loading…
          </span>
        ) : (
          <span className="block bg-[#fff8e1] border border-[#bfa76a] rounded px-2 py-1 text-[10px] font-serif text-[#6b3e26] shadow-lg">
            {name}
          </span>
        )}
      </span>
    </span>
  );
}
