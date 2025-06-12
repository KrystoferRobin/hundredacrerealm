import prisma from '../../../lib/prisma';
import React from 'react';

export async function generateStaticParams() {
  const monsters = await prisma.monster.findMany({ select: { baseName: true } });
  const unique = Array.from(new Set(monsters.map(m => m.baseName).filter(Boolean)));
  return unique.map(baseName => ({ baseName: encodeURIComponent(baseName) }));
}

export default async function MonsterPage({ params }) {
  const baseName = decodeURIComponent(params.baseName);
  // Get all variants for this monster baseName
  const monsters = await prisma.monster.findMany({
    where: { baseName },
    orderBy: { monsterId: 'asc' },
  });
  if (!monsters.length) {
    return <div>Monster not found</div>;
  }
  const main = monsters[0];
  const totalKills = monsters.reduce((sum, m) => sum + (m.killCount || 0), 0);

  // Group variants by setupStart for numbering and grouping
  const setupStartGroups = {};
  monsters.forEach(m => {
    if (!setupStartGroups[m.setupStart]) setupStartGroups[m.setupStart] = [];
    setupStartGroups[m.setupStart].push(m);
  });

  // Only show variants that are not contained by another monster
  const mainVariants = monsters.filter(m => m.containedById == null);

  // Helper to get contained monsters for a given monsterId (search all monsters, not just same baseName)
  const [allMonsters] = await Promise.all([
    prisma.monster.findMany({}),
  ]);
  const getContained = (monsterId) =>
    allMonsters.filter(m => m.containedById === monsterId);

  // Helper to get label for a variant
  function getVariantLabel(m, group) {
    if (!m.setupStart) return '';
    const groupArr = group.filter(v => v.setupStart === m.setupStart);
    if (groupArr.length > 1) {
      const idx = groupArr.findIndex(v => v.monsterId === m.monsterId) + 1;
      return `#${idx}`;
    }
    return '';
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center mb-4">
        <h1 className="text-3xl font-medieval text-black">{main.baseName}</h1>
        <p className="text-black">Killed {totalKills} times</p>
      </div>
      <div className="flex bg-white p-4 rounded shadow relative">
        <div className="w-1/3 flex flex-col items-center">
          {main.portrait && (
            <img src={main.portrait} alt={`${main.baseName} portrait`} className="w-full h-full object-cover mb-2" />
          )}
        </div>
        <div className="w-2/3 pl-4 flex flex-col justify-between">
          <div>
            {/* Fame/Notoriety Row */}
            {(main.fame || main.notoriety) && (
              <div className="flex flex-row justify-between mb-2">
                <div className="text-left font-bold" style={{ minWidth: 40, color: main.fame ? '#2563eb' : undefined }}>{main.fame ? <span style={{ color: '#2563eb' }}>Fame</span> : ''}{main.fame ? `: ${main.fame}` : ''}</div>
                <div className="flex-1"></div>
                <div className="text-right font-bold" style={{ minWidth: 40, color: main.notoriety ? '#b04a5a' : undefined, marginLeft: 'auto', marginRight: '25%' }}>{main.notoriety ? <span style={{ color: '#b04a5a' }}>Notoriety</span> : ''}{main.notoriety ? `: ${main.notoriety}` : ''}</div>
              </div>
            )}
            {main.gold && <p className="text-black"><strong>Gold:</strong> {main.gold}</p>}
            {main.treasure && <p className="text-black"><strong>Treasure:</strong> {main.treasure}</p>}
            <p className="text-black"><strong>Description:</strong></p>
            <div className="text-black mb-2 min-h-[1.5em]"></div>
            <p className="text-black"><strong>Strategy:</strong></p>
            <div className="text-black min-h-[1.5em]"></div>
          </div>
        </div>
      </div>
      {/* Variants Panel */}
      <div className="mt-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-medieval mb-2 text-black">Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(setupStartGroups).map(([setupStart, group]) => (
            <div key={setupStart} className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="font-bold text-yellow-800 mb-2 text-center">{setupStart || 'Other'}</div>
              <div className="flex flex-col gap-6">
                {group.filter(m => m.containedById == null).map((m, idx) => {
                  // Contained monsters
                  const contained = getContained(m.monsterId);
                  const label = getVariantLabel(m, group);
                  return (
                    <div key={m.monsterId} className="flex flex-row items-center gap-8">
                      <div className="flex-1">
                        <div className="font-semibold text-black">
                          {m.name} {label && <span className="text-gray-500">({label})</span>}
                          {m.armored && <span className="ml-1 text-gray-600">Armored{m.armored > 1 ? ` ${m.armored}` : ''}</span>}
                        </div>
                        <div className="flex flex-row gap-4 mt-2 items-end">
                          {/* Light Side Box */}
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 min-w-[120px]">
                            {m.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {m.vulnerability}</div>}
                            {m.lightMoveSpeed && <div className="text-xs text-black">Move Speed: {m.lightMoveSpeed}</div>}
                            {m.lightAttackSpeed && <div className="text-xs text-black">Attack Speed: {m.lightAttackSpeed}</div>}
                            {m.lightStrength && <div className="text-xs text-black">Strength: {m.lightStrength}</div>}
                            {m.lightChitColor && <div className="text-xs text-black">Chit Color: {m.lightChitColor}</div>}
                            {m.lightPins && <div className="text-xs text-black">Pins: {m.lightPins}</div>}
                          </div>
                          {/* Dark Side Box */}
                          <div className="bg-gray-100 border border-gray-300 rounded p-2 min-w-[120px]">
                            {m.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {m.vulnerability}</div>}
                            {m.darkMoveSpeed && <div className="text-xs text-black">Move Speed: {m.darkMoveSpeed}</div>}
                            {m.darkAttackSpeed && <div className="text-xs text-black">Attack Speed: {m.darkAttackSpeed}</div>}
                            {m.darkStrength && <div className="text-xs text-black">Strength: {m.darkStrength}</div>}
                            {m.darkChitColor && <div className="text-xs text-black">Chit Color: {m.darkChitColor}</div>}
                            {m.darkPins && <div className="text-xs text-black">Pins: {m.darkPins}</div>}
                          </div>
                          {/* Contained monsters */}
                          {contained.map((cm) => (
                            <div key={cm.monsterId} className="flex flex-col items-center ml-4">
                              <div className="font-semibold text-black">
                                {cm.name}{cm.armored && <span className="ml-1 text-gray-600">Armored{cm.armored > 1 ? ` ${cm.armored}` : ''}</span>}
                              </div>
                              <div className="flex flex-row gap-2 mt-1">
                                <div className="bg-blue-50 border border-blue-200 rounded p-2 min-w-[96px] scale-90" style={{ fontSize: '0.8em' }}>
                                  {cm.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {cm.vulnerability}</div>}
                                  {cm.lightMoveSpeed && <div className="text-xs text-black">Move Speed: {cm.lightMoveSpeed}</div>}
                                  {cm.lightAttackSpeed && <div className="text-xs text-black">Attack Speed: {cm.lightAttackSpeed}</div>}
                                  {cm.lightStrength && <div className="text-xs text-black">Strength: {cm.lightStrength}</div>}
                                  {cm.lightChitColor && <div className="text-xs text-black">Chit Color: {cm.lightChitColor}</div>}
                                  {cm.lightPins && <div className="text-xs text-black">Pins: {cm.lightPins}</div>}
                                </div>
                                <div className="bg-gray-100 border border-gray-300 rounded p-2 min-w-[96px] scale-90" style={{ fontSize: '0.8em' }}>
                                  {cm.vulnerability && <div className="text-xs text-black font-bold">Vulnerability: {cm.vulnerability}</div>}
                                  {cm.darkMoveSpeed && <div className="text-xs text-black">Move Speed: {cm.darkMoveSpeed}</div>}
                                  {cm.darkAttackSpeed && <div className="text-xs text-black">Attack Speed: {cm.darkAttackSpeed}</div>}
                                  {cm.darkStrength && <div className="text-xs text-black">Strength: {cm.darkStrength}</div>}
                                  {cm.darkChitColor && <div className="text-xs text-black">Chit Color: {cm.darkChitColor}</div>}
                                  {cm.darkPins && <div className="text-xs text-black">Pins: {cm.darkPins}</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 