'use client';

import React, { useState, useRef } from 'react';

interface ItemPopoverProps {
  itemName: string;
  children: React.ReactNode;
}

function getImagePath(itemName: string, state: 'unalerted' | 'alerted' | 'intact' | 'damaged' | 'trot' | 'gallop') {
  // Lowercase, replace spaces and non-alphanumerics with hyphens
  const base = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (state === 'alerted' || state === 'damaged' || state === 'gallop') {
    return `/images/items/${base}-alert.png`;
  }
  return `/images/items/${base}.png`;
}

function displayStat(label: string, value: any) {
  if (!value || value === '-' || value === '') return null;
  return <div>{label}: {value}</div>;
}

export default function ItemPopover({ itemName, children }: ItemPopoverProps) {
  const [show, setShow] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [imgLoaded, setImgLoaded] = useState({ left: true, right: true });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchItem = async () => {
    if (!item) {
      const res = await fetch(`/api/items/${encodeURIComponent(itemName)}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data);
      }
    }
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(true);
      fetchItem();
    }, 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  };

  // Find the correct state objects
  let left = null, right = null, leftImg = null, rightImg = null;
  let hasStandardStates = false;
  let isDestroyedOnly = false;
  if (item && item.states && Array.isArray(item.states)) {
    left = item.states.find((s: any) =>
      s.state === 'intact' || s.state === 'unalerted'
    );
    right = item.states.find((s: any) =>
      s.state === 'damaged' || s.state === 'alerted'
    );
    hasStandardStates = !!left || !!right;
    // Special case: only 'destroyed' state exists (e.g. Golden Crown)
    if (!hasStandardStates) {
      const destroyed = item.states.find((s: any) => s.state === 'destroyed');
      if (destroyed) {
        left = destroyed;
        leftImg = null;
        right = null;
        isDestroyedOnly = true;
      }
    }
    if (left && left.state === 'intact') leftImg = getImagePath(item.name, 'intact');
    if (left && left.state === 'unalerted') leftImg = getImagePath(item.name, 'unalerted');
    if (right && right.state === 'damaged') rightImg = getImagePath(item.name, 'damaged');
    if (right && right.state === 'alerted') rightImg = getImagePath(item.name, 'alerted');
  }

  let isArmor = false;
  let isWeapon = false;
  let isHorse = false;
  let isMisc = false;
  let magic = '';
  let length = '';
  let weight = '';
  let basePrice = '';
  let fame = null;
  let notoriety = null;
  let destroyedBasePrice = null;
  let moveBonus = null;
  let vulnerability = null;
  let moveSpeed = null;
  let strength = null;
  let chitColor = null;
  let armored = null;
  let ability = null;
  let isGreatTreasure = false;

  if (item) {
    isArmor = item.type === 'armor' || item.type === 'shield';
    isWeapon = item.type === 'weapon';
    isHorse = item.name.includes('Horse') || item.name.includes('Pony');
    isMisc = !isArmor && !isWeapon && !isHorse;

    // Find state objects
    if (item.states && Array.isArray(item.states)) {
      if (isArmor) {
        left = item.states.find((s: any) => s.state === 'intact');
        right = item.states.find((s: any) => s.state === 'damaged');
        leftImg = getImagePath(item.name, 'intact');
        rightImg = getImagePath(item.name, 'damaged');
        if (right && right.basePrice && right.basePrice !== left?.basePrice) {
          destroyedBasePrice = right.basePrice;
        }
      } else if (isHorse) {
        left = item.states.find((s: any) => s.state === 'trot');
        right = item.states.find((s: any) => s.state === 'gallop');
        leftImg = getImagePath(item.name, 'trot');
        rightImg = getImagePath(item.name, 'gallop');
        moveBonus = item.moveBonus;
        vulnerability = item.vulnerability;
        if (left) {
          moveSpeed = left.moveSpeed;
          strength = left.strength;
          chitColor = left.color;
        }
        if (right) {
          armored = right.armored;
        }
      } else {
        left = item.states.find((s: any) => s.state === 'unalerted');
        right = item.states.find((s: any) => s.state === 'alerted');
        leftImg = getImagePath(item.name, 'unalerted');
        rightImg = getImagePath(item.name, 'alerted');
      }
    }
    magic = item.magic || '';
    length = item.length || '';
    weight = item.weight || '';
    basePrice = item.basePrice ? String(item.basePrice) : '';
    fame = item.fame ?? left?.fame ?? null;
    notoriety = item.notoriety ?? left?.notoriety ?? null;
    // If state-specific fame/notoriety exist, prefer left state
    if (left) {
      if (left.fame !== undefined && left.fame !== null) fame = left.fame;
      if (left.notoriety !== undefined && left.notoriety !== null) notoriety = left.notoriety;
    }
    if (isMisc) {
      ability = item.text;
      isGreatTreasure = item.isGreatTreasure;
    } else if (isArmor || isWeapon) {
      ability = item.text;
    }
  }

  // Compose bottom row values
  const showLength = !!length;
  const showMagic = !!magic;
  const showWeight = !!weight;
  const showBasePrice = !!basePrice;
  const showFame = fame !== null && fame !== undefined && fame !== 0;
  const showNotoriety = notoriety !== null && notoriety !== undefined && notoriety !== 0;
  const showDestroyedBasePrice = destroyedBasePrice !== null && destroyedBasePrice !== undefined && destroyedBasePrice !== '';
  const showMoveBonus = moveBonus !== null && moveBonus !== undefined;
  const showVulnerability = vulnerability !== null && vulnerability !== undefined;
  const showMoveSpeed = moveSpeed !== null && moveSpeed !== undefined;
  const showStrength = strength !== null && strength !== undefined;
  const showChitColor = chitColor !== null && chitColor !== undefined;
  const showArmored = armored !== null && armored !== undefined;
  const showAbility = ability !== null && ability !== undefined;
  const showIsGreatTreasure = isGreatTreasure;

  // Determine if this is a large treasure
  const isLargeTreasure = item?.treasure === 'large';

  return (
    <span className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && item && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 mt-2 border border-gray-300 shadow-lg rounded p-4 min-w-[320px] max-w-[420px] text-xs whitespace-pre-wrap ${showIsGreatTreasure ? 'bg-yellow-100' : ''}`}
          style={isLargeTreasure
            ? { background: 'linear-gradient(135deg, #fffbe6 60%, #ffe066 100%)' }
            : { background: '#fff' }
          }
        >
          {/* Large Treasure Label */}
          {isLargeTreasure && (
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8a6d1b',
                fontFamily: 'Cinzel Decorative, UnifrakturCook, fantasy',
                fontWeight: 700,
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                textShadow: '0 1px 2px #fffbe6, 0 2px 8px #bfa13a',
                writingMode: 'vertical-lr',
                textAlign: 'center',
                lineHeight: 1,
                pointerEvents: 'none',
                zIndex: 2,
              }}
              aria-label="Large Treasure"
            >
              Large
            </div>
          )}
          {/* Fame/Notoriety Row */}
          {(showFame || showNotoriety) && (
            <div className="flex flex-row justify-between mb-1" style={isLargeTreasure ? { marginLeft: '48px' } : {}}>
              <div className="text-left font-bold" style={{ minWidth: 40, color: showFame ? '#2563eb' : undefined }}>{showFame ? <span style={{ color: '#2563eb' }}>Fame</span> : ''}{showFame ? `: ${fame}` : ''}</div>
              <div className="flex-1"></div>
              <div className="text-right font-bold" style={{ minWidth: 40, color: showNotoriety ? '#b04a5a' : undefined }}>{showNotoriety ? <span style={{ color: '#b04a5a' }}>Notoriety</span> : ''}{showNotoriety ? `: ${notoriety}` : ''}</div>
            </div>
          )}
          <div className="font-bold mb-2 text-center">{item.name}</div>
          {/* Only show state boxes if there are standard states or a single destroyed state */}
          {(hasStandardStates || isDestroyedOnly) && (
            <div className="flex flex-row items-center justify-center gap-4 mb-2">
              {/* Single box for only destroyed state */}
              {isDestroyedOnly ? (
                <div className="flex flex-col items-center w-28 mx-auto">
                  <div className="border rounded p-2 w-full text-center bg-gray-50">
                    {isArmor ? (
                      <>
                        {displayStat('Vulnerability', left?.vulnerability)}
                        {displayStat('Base Price', left?.basePrice)}
                      </>
                    ) : (
                      <>
                        {displayStat('Strength', left?.strength)}
                        {displayStat('Sharpness', left?.sharpness)}
                        {displayStat('Color', left?.color)}
                        {displayStat('Attack Speed', left?.attackSpeed)}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Intact</div>
                </div>
              ) : (
                <>
                  {/* Left image or stats */}
                  {left && (
                    <div className="flex flex-col items-center w-28">
                      {imgLoaded.left && leftImg && (
                        <img
                          src={leftImg}
                          alt={isArmor ? 'Intact' : isHorse ? 'Trot' : 'Unalerted'}
                          className="w-20 h-20 object-contain mb-1"
                          onError={() => setImgLoaded(l => ({ ...l, left: false }))}
                        />
                      )}
                      {!imgLoaded.left && (
                        <div className="border rounded p-2 w-full text-center bg-gray-50">
                          {isArmor ? (
                            <>
                              {displayStat('Vulnerability', left.vulnerability)}
                              {displayStat('Base Price', left.basePrice)}
                            </>
                          ) : isHorse ? (
                            <>
                              {displayStat('Move Speed', moveSpeed)}
                              {displayStat('Strength', strength)}
                              {displayStat('Chit Color', chitColor)}
                            </>
                          ) : (
                            <>
                              {displayStat('Strength', left.strength)}
                              {displayStat('Sharpness', left.sharpness)}
                              {displayStat('Color', left.color)}
                              {displayStat('Attack Speed', left.attackSpeed)}
                            </>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{isArmor ? 'Intact' : isHorse ? 'Trot' : 'Unalerted'}</div>
                    </div>
                  )}
                  {/* Right image or stats */}
                  {right && (rightImg || !imgLoaded.right) && (
                    <div className="flex flex-col items-center w-28">
                      {imgLoaded.right && rightImg && (
                        <img
                          src={rightImg}
                          alt={isArmor ? 'Damaged' : isHorse ? 'Gallop' : 'Alerted'}
                          className="w-20 h-20 object-contain mb-1"
                          onError={() => setImgLoaded(l => ({ ...l, right: false }))}
                        />
                      )}
                      {!imgLoaded.right && (
                        <div className="border rounded p-2 w-full text-center bg-gray-50">
                          {isArmor ? (
                            <>
                              {displayStat('Vulnerability', right.vulnerability)}
                              {displayStat('Base Price', right.basePrice)}
                            </>
                          ) : isHorse ? (
                            <>
                              {displayStat('Armored', armored)}
                            </>
                          ) : (
                            <>
                              {displayStat('Strength', right.strength)}
                              {displayStat('Sharpness', right.sharpness)}
                              {displayStat('Color', right.color)}
                              {displayStat('Attack Speed', right.attackSpeed)}
                            </>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{isArmor ? 'Damaged' : isHorse ? 'Gallop' : 'Alerted'}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {showAbility && (
            <div className="text-center font-semibold mb-2">Ability: {ability}</div>
          )}
          {(showLength || showMagic || showWeight || showBasePrice || showMoveBonus || showVulnerability) && (
            <div className="flex flex-row justify-between mt-2 items-center">
              <div className="text-left font-semibold" style={{ minWidth: 70 }}>
                {showMagic ? `Magic: ${magic}` : showLength ? `Length: ${length}` : showVulnerability ? `Vulnerability: ${vulnerability}` : ''}
              </div>
              <div className="text-center font-semibold flex-1">
                {showWeight ? `Weight: ${weight}` : showMoveBonus ? `Move Bonus: ${moveBonus}` : ''}
              </div>
              <div className="text-right font-semibold" style={{ minWidth: 70 }}>
                {showBasePrice ? `Base Price: ${basePrice}` : ''}
                {showDestroyedBasePrice && (
                  <div className="text-xs text-gray-600 mt-1">Destroyed: {destroyedBasePrice}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
} 