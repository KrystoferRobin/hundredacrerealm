"use client";

import { useState, useEffect } from 'react';
import { NativeChitToken } from '@/components/NativeChitToken';
import type { NativeRecord } from '@/lib/native-token-image';

interface NativeGroup {
  dwelling: string;
  displayName: string;
  natives: NativeRecord[];
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

  const hasDifferentStats = (native1: NativeRecord, native2: NativeRecord): boolean => {
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

  const processNatives = (natives: NativeRecord[]): NativeRecord[] => {
    const sorted = natives.sort((a, b) => {
      const aIsHQ = a.name.includes('HQ');
      const bIsHQ = b.name.includes('HQ');
      if (aIsHQ && !bIsHQ) return -1;
      if (!aIsHQ && bIsHQ) return 1;
      return a.name.localeCompare(b.name);
    });

    const filtered: NativeRecord[] = [];
    const seen = new Set<string>();

    for (const native of sorted) {
      const key = `${native.attributeBlocks.this.native}_${native.attributeBlocks.this.rank}`;
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(native);
      } else {
        const existing = filtered.find(
          (n) =>
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

  const renderNativeGroup = (group: NativeGroup) => (
    <div
      key={group.dwelling}
      className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg relative overflow-hidden group"
      style={{
        boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}
    >
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md" />

      <h3 className="text-xl font-bold mb-4 text-[#6b3e26] font-serif text-center">
        {group.displayName}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {processNatives(group.natives).map((native) => (
          <div key={native.id} className="space-y-2">
            <div className="text-sm font-semibold text-[#6b3e26] font-serif text-center">
              {native.name}
            </div>
            <div className="flex justify-center gap-2">
              <NativeChitToken native={native} side="light" />
              <NativeChitToken native={native} side="dark" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Natives...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto" />
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
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{ minHeight: '100vh' }}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col px-4">
          <p className="text-center text-sm text-[#6b3e26] font-serif mt-4 mb-2 opacity-80">
            Alternative (Wesnoth) counter art — matches RealmSpeak alternative display
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
            {nativeGroups.map(renderNativeGroup)}
          </div>
          <div className="text-center mt-8 mb-6">
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
