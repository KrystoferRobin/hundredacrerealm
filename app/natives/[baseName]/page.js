import prisma from '../../../lib/prisma';
import React from 'react';

export async function generateStaticParams() {
  const natives = await prisma.native.findMany({ select: { native: true } });
  const unique = Array.from(new Set(natives.map(n => n.native?.toLowerCase()).filter(Boolean)));
  return unique.map(native => ({ baseName: native }));
}

export default async function NativePage({ params }) {
  const { baseName } = params;
  // Fetch all natives and filter in JS for case-insensitive match
  const allNatives = await prisma.native.findMany({ orderBy: { nativeId: 'asc' } });
  // Find the dwelling's nativeId for this group (case-insensitive)
  const dwellingEntry = allNatives.find(
    n => n.native && n.native.toLowerCase() === baseName.toLowerCase() && n.name && n.dwelling && n.name.toLowerCase() === n.dwelling.toLowerCase()
  );
  const dwellingNativeId = dwellingEntry ? dwellingEntry.nativeId : null;

  // Show all group members except the dwelling itself and entries contained by other group members
  const filteredNatives = allNatives.filter(n => {
    if (!(n.native && n.native.toLowerCase() === baseName.toLowerCase() && n.name !== n.dwelling)) return false;
    if (dwellingNativeId !== null) {
      return n.containedById == null || n.containedById === dwellingNativeId;
    } else {
      // fallback: include all with containedById != null
      return n.containedById == null || n.containedById !== null;
    }
  });

  if (filteredNatives.length === 0) {
    return <div>Native not found</div>;
  }

  // Group natives by dwelling (never display the dwelling entry itself)
  const groupedNatives = filteredNatives.reduce((acc, native) => {
    const key = native.dwelling && native.dwelling.trim() ? native.dwelling : 'No Dwelling';
    if (!acc[key]) acc[key] = [];
    acc[key].push(native);
    return acc;
  }, {});

  // Helper to get contained natives for a given native
  const getContained = (native) => {
    if (!native.containsIds) return [];
    const ids = native.containsIds.split(',').map(id => parseInt(id, 10));
    return allNatives.filter(n => ids.includes(n.nativeId));
  };

  // Group image path
  const groupImage = `/images/natives/${baseName.charAt(0).toUpperCase() + baseName.slice(1)}.png`;

  // Helper to sort natives: HQ first, then numbered variants in order, then others
  function sortNatives(natives, dwelling) {
    // Remove the dwelling entry itself by name and by baseName
    const filtered = natives.filter(n => n.name !== dwelling && n.baseName !== dwelling);
    const hq = filtered.find(n => n.name.toLowerCase().includes('hq'));
    const numbered = filtered
      .filter(n => /\d+$/.test(n.name) && !n.name.toLowerCase().includes('hq'))
      .sort((a, b) => {
        const aNum = parseInt(a.name.match(/(\d+)$/)?.[1] || '0', 10);
        const bNum = parseInt(b.name.match(/(\d+)$/)?.[1] || '0', 10);
        return aNum - bNum;
      });
    const others = filtered.filter(n => !n.name.toLowerCase().includes('hq') && !/\d+$/.test(n.name));
    return [hq, ...numbered, ...others].filter(Boolean);
  }

  // Helper to display horse/contained stats
  function renderContainedStats(cn) {
    // For horses/ponies, show both sides (trot/gallop), move speed, strength, chit color, and move_bonus if present
    return (
      <div className="w-full mt-2">
        <div className="flex flex-row gap-4">
          {/* Trot/Left side */}
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded p-2">
            <div className="font-bold text-xs text-black mb-1">Trot</div>
            {cn.lightMoveSpeed && <div className="text-xs text-black">Move Speed: {cn.lightMoveSpeed}</div>}
            {cn.lightStrength && <div className="text-xs text-black">Strength: {cn.lightStrength}</div>}
            {cn.lightChitColor && <div className="text-xs text-black">Chit Color: {cn.lightChitColor}</div>}
          </div>
          {/* Gallop/Right side */}
          <div className="flex-1 bg-gray-100 border border-gray-300 rounded p-2">
            <div className="font-bold text-xs text-black mb-1">Gallop</div>
            {cn.darkMoveSpeed && <div className="text-xs text-black">Move Speed: {cn.darkMoveSpeed}</div>}
            {cn.darkStrength && <div className="text-xs text-black">Strength: {cn.darkStrength}</div>}
            {cn.darkChitColor && <div className="text-xs text-black">Chit Color: {cn.darkChitColor}</div>}
          </div>
        </div>
        {cn.move_bonus && (
          <div className="text-xs text-black mt-2 text-center">Ability: {cn.move_bonus}</div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Group Header: Group Name centered, portrait and attributes */}
      <div className="flex flex-col items-center mb-4">
        <h1 className="text-3xl font-medieval text-black text-center w-full mb-2">{baseName.charAt(0).toUpperCase() + baseName.slice(1)}</h1>
        <div className="flex flex-row items-start w-full justify-center gap-8">
          <img src={groupImage} alt={baseName + ' group'} className="w-32 h-32 object-contain bg-white border rounded" />
          {/* Group attributes */}
          <div className="flex flex-col justify-start text-black text-lg min-w-[220px]">
            {/* Use the first native as the group representative, skipping the dwelling and null-stat entries */}
            {(() => {
              // Find the first native that is not the dwelling and has at least one of fame, notoriety, or vulnerability non-null
              const groupRep = filteredNatives.find(n => (
                n.name !== n.dwelling &&
                (n.fame !== null || n.notoriety !== null || n.vulnerability !== null)
              ));
              if (!groupRep) return null;
              return (
                <>
                  {groupRep.type && <div><b>Type:</b> {groupRep.type}</div>}
                  {groupRep.group && <div><b>Group:</b> {groupRep.group}</div>}
                  {/* Native field hidden as redundant */}
                  <div><b>Fame:</b> {String(groupRep.fame)}</div>
                  <div><b>Notoriety:</b> {String(groupRep.notoriety)}</div>
                  {groupRep.gold !== undefined && groupRep.gold !== null && <div><b>Gold:</b> {groupRep.gold}</div>}
                  {groupRep.treasure && <div><b>Treasure:</b> {groupRep.treasure}</div>}
                  {groupRep.warning && <div><b>Warning:</b> {groupRep.warning}</div>}
                  {groupRep.weight && <div><b>Weight:</b> {groupRep.weight}</div>}
                  <div><b>Vulnerability:</b> {String(groupRep.vulnerability)}</div>
                  {/* Only show Armored if not null/undefined and not 0 */}
                  {groupRep.armored !== undefined && groupRep.armored !== null && groupRep.armored !== 0 && <div><b>Armored:</b> {groupRep.armored}</div>}
                  <div><b>Description:</b> {groupRep.description || <span className="italic text-gray-500">(none yet)</span>}</div>
                  <div><b>Strategies:</b> {groupRep.strategies || <span className="italic text-gray-500">(none yet)</span>}</div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Grouped Natives Panel */}
      <div className="mt-8 bg-white p-4 rounded shadow">
        <div className="flex flex-col gap-6">
          {Object.entries(groupedNatives).map(([dwelling, group]) => {
            if (dwelling === 'No Dwelling') return null;
            const sortedNatives = sortNatives(group, dwelling);
            return (
              <div key={dwelling} className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <div className="font-bold text-yellow-800 mb-2 text-center">{dwelling}</div>
                <div className="flex flex-col gap-6">
                  {sortedNatives.map((n, idx) => {
                    const contained = getContained(n);
                    return (
                      <div key={n.nativeId} className="flex flex-row items-center gap-8">
                        <div className="flex-1">
                          <div className="font-semibold text-black">
                            {n.name}
                            {n.basePrice !== undefined && n.basePrice !== null && (
                              <span className="block text-xs text-gray-700 font-normal">Base Price: {n.basePrice}</span>
                            )}
                            {n.armored && <span className="ml-1 text-gray-600">Armored{n.armored > 1 ? ` ${n.armored}` : ''}</span>}
                          </div>
                          <div className="flex flex-row gap-4 mt-2 items-end">
                            {/* Light Side Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 min-w-[120px]">
                              {n.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {n.vulnerability}</div>}
                              {n.lightMoveSpeed && <div className="text-xs text-black">Move Speed: {n.lightMoveSpeed}</div>}
                              {n.lightAttackSpeed && <div className="text-xs text-black">Attack Speed: {n.lightAttackSpeed}</div>}
                              {n.lightStrength && <div className="text-xs text-black">Strength: {n.lightStrength}</div>}
                              {n.lightChitColor && <div className="text-xs text-black">Chit Color: {n.lightChitColor}</div>}
                              {n.lightPins && <div className="text-xs text-black">Pins: {n.lightPins}</div>}
                            </div>
                            {/* Dark Side Box */}
                            <div className="bg-gray-100 border border-gray-300 rounded p-2 min-w-[120px]">
                              {n.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {n.vulnerability}</div>}
                              {n.darkMoveSpeed && <div className="text-xs text-black">Move Speed: {n.darkMoveSpeed}</div>}
                              {n.darkAttackSpeed && <div className="text-xs text-black">Attack Speed: {n.darkAttackSpeed}</div>}
                              {n.darkStrength && <div className="text-xs text-black">Strength: {n.darkStrength}</div>}
                              {n.darkChitColor && <div className="text-xs text-black">Chit Color: {n.darkChitColor}</div>}
                              {n.darkPins && <div className="text-xs text-black">Pins: {n.darkPins}</div>}
                            </div>
                            {/* Contained natives */}
                            {contained.map((cn) => {
                              // Parse sides JSON if present
                              let sides = [];
                              if (cn.sides) {
                                try {
                                  sides = JSON.parse(cn.sides);
                                } catch (e) {
                                  sides = [];
                                }
                              }
                              return (
                                <div key={cn.nativeId} className="flex flex-col items-center ml-4">
                                  <div className="font-semibold text-black">
                                    {cn.name}{cn.armored && <span className="ml-1 text-gray-600">Armored{cn.armored > 1 ? ` ${cn.armored}` : ''}</span>}
                                  </div>
                                  <div className="flex flex-row gap-2 mt-1">
                                    {sides.length > 0 ? (
                                      sides.map((side, i) => (
                                        <div key={i} className="bg-blue-50 border border-blue-200 rounded p-2 min-w-[96px] scale-90 flex flex-col items-center justify-between" style={{ fontSize: '0.8em' }}>
                                          {side.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {side.vulnerability}</div>}
                                          {side.moveSpeed && <div className="text-xs text-black">Move Speed: {side.moveSpeed}</div>}
                                          {side.strength && <div className="text-xs text-black">Strength: {side.strength}</div>}
                                          {side.chitColor && <div className="text-xs text-black">Chit Color: {side.chitColor}</div>}
                                          {side.move_bonus && <div className="text-xs text-black">Ability: {side.move_bonus}</div>}
                                          <div className="text-xs text-black font-bold mt-2 text-center w-full border-t pt-1">{side.blockName}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <>
                                        <div className="bg-blue-50 border border-blue-200 rounded p-2 min-w-[96px] scale-90" style={{ fontSize: '0.8em' }}>
                                          {cn.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {cn.vulnerability}</div>}
                                          {cn.lightMoveSpeed && <div className="text-xs text-black">Move Speed: {cn.lightMoveSpeed}</div>}
                                          {cn.lightAttackSpeed && <div className="text-xs text-black">Attack Speed: {cn.lightAttackSpeed}</div>}
                                          {cn.lightStrength && <div className="text-xs text-black">Strength: {cn.lightStrength}</div>}
                                          {cn.lightChitColor && <div className="text-xs text-black">Chit Color: {cn.lightChitColor}</div>}
                                          {cn.lightPins && <div className="text-xs text-black">Pins: {cn.lightPins}</div>}
                                        </div>
                                        <div className="bg-gray-100 border border-gray-300 rounded p-2 min-w-[96px] scale-90" style={{ fontSize: '0.8em' }}>
                                          {cn.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {cn.vulnerability}</div>}
                                          {cn.darkMoveSpeed && <div className="text-xs text-black">Move Speed: {cn.darkMoveSpeed}</div>}
                                          {cn.darkAttackSpeed && <div className="text-xs text-black">Attack Speed: {cn.darkAttackSpeed}</div>}
                                          {cn.darkStrength && <div className="text-xs text-black">Strength: {cn.darkStrength}</div>}
                                          {cn.darkChitColor && <div className="text-xs text-black">Chit Color: {cn.darkChitColor}</div>}
                                          {cn.darkPins && <div className="text-xs text-black">Pins: {cn.darkPins}</div>}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 