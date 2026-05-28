'use client';

interface ItemRecord {
  id?: string;
  name: string;
  attributeBlocks: Record<string, Record<string, string>>;
}

function getChitColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    lightorange: '#FFB366',
    red: '#FF4444',
    blue: '#4444FF',
    green: '#44FF44',
    yellow: '#FFFF44',
    purple: '#FF44FF',
    brown: '#8B4513',
    grey: '#888888',
    gray: '#888888',
    white: '#FFFFFF',
    black: '#000000',
    lightgreen: '#90EE90',
    forestgreen: '#228B22',
  };
  return colorMap[colorName] || '#FFFFFF';
}

function ArmorChit({ item, side }: { item: ItemRecord; side: 'intact' | 'damaged' }) {
  const sideData = item.attributeBlocks[side];
  const thisData = item.attributeBlocks.this;
  return (
    <div
      className="relative w-16 h-16 border-2 border-[#6b3e26] rounded-md"
      style={{ backgroundColor: getChitColor(sideData.chit_color) }}
    >
      <div className="absolute top-0 left-0 bg-white text-black text-xs font-bold px-1 rounded">
        {thisData.vulnerability}
      </div>
      <div className="absolute top-0 right-0 bg-[#FFFF44] text-black text-xs font-bold px-1 rounded">
        {thisData.weight}
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black text-xs font-bold px-1 rounded">
        {sideData.base_price}
      </div>
    </div>
  );
}

function WeaponChit({ item, side }: { item: ItemRecord; side: 'unalerted' | 'alerted' }) {
  const sideData = item.attributeBlocks[side];
  const thisData = item.attributeBlocks.this;
  return (
    <div
      className="relative w-16 h-16 border-2 border-[#6b3e26] rounded-md"
      style={{ backgroundColor: getChitColor(sideData.chit_color) }}
    >
      <div className="absolute top-0 left-0 bg-[#FFFF44] text-black text-xs font-bold px-1 rounded">
        {thisData.weight}
      </div>
      <div className="absolute top-0 right-0 bg-[#4444FF] text-white text-xs font-bold px-1 rounded">
        {thisData.length}
      </div>
      <div className="absolute bottom-0 left-0 bg-[#44FF44] text-black text-xs font-bold px-1 rounded">
        {sideData.attack_speed}
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#FF0000] text-black text-xs font-bold px-1 rounded">
        {sideData.strength}
      </div>
      <div className="absolute bottom-0 right-0 bg-[#FF44FF] text-black text-xs font-bold px-1 rounded">
        {sideData.sharpness}
      </div>
    </div>
  );
}

function TreasureChit({ item }: { item: ItemRecord }) {
  const thisData = item.attributeBlocks.this;
  const isLarge = item.attributeBlocks.this?.treasure === 'large';
  return (
    <div
      className="relative w-16 h-16 border-2 border-[#6b3e26] rounded-md"
      style={{ backgroundColor: isLarge ? '#FFD700' : getChitColor(thisData.chit_color || 'white') }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[#FFD700] text-black text-xs font-bold px-1 rounded">
          {thisData.base_price || '?'}
        </div>
      </div>
    </div>
  );
}

export function ItemTooltipPanel({ item }: { item: ItemRecord }) {
  const isArmor = item.attributeBlocks.intact && item.attributeBlocks.damaged;
  const isWeapon = item.attributeBlocks.unalerted && item.attributeBlocks.alerted;
  const isSpell = item.attributeBlocks.this?.spell;
  const isTreasure = !isArmor && !isWeapon && !isSpell;

  return (
    <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-48">
      <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">{item.name}</div>

      {isSpell && (
        <div className="space-y-2 text-xs text-[#6b3e26] font-serif">
          <div className="flex justify-between">
            <span className="font-semibold">Type {item.attributeBlocks.this.spell}</span>
            <span className="capitalize">{item.attributeBlocks.this.duration}</span>
          </div>
          <div className="border-t border-[#bfa76a] pt-2 italic leading-relaxed">
            {item.attributeBlocks.this.text || 'No description available'}
          </div>
        </div>
      )}

      {isArmor && (
        <div className="space-y-2">
          <div className="text-xs text-[#6b3e26] font-serif">Armor Sides:</div>
          <div className="flex justify-center space-x-2">
            <ArmorChit item={item} side="intact" />
            <ArmorChit item={item} side="damaged" />
          </div>
        </div>
      )}

      {isWeapon && (
        <div className="space-y-2">
          <div className="text-xs text-[#6b3e26] font-serif">Weapon Sides:</div>
          <div className="flex justify-center space-x-2">
            <WeaponChit item={item} side="unalerted" />
            <WeaponChit item={item} side="alerted" />
          </div>
        </div>
      )}

      {isTreasure && (
        <div className="space-y-2">
          <div className="text-xs text-[#6b3e26] font-serif">Treasure:</div>
          <div className="flex justify-center">
            <TreasureChit item={item} />
          </div>
        </div>
      )}
    </div>
  );
}
