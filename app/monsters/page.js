import prisma from '../../lib/prisma';
import Link from 'next/link';
import React from 'react';

export default async function MonstersPage() {
  // Get all unique baseNames
  const monsters = await prisma.monster.findMany({
    where: { containedById: null },
    distinct: ['baseName'],
    orderBy: { baseName: 'asc' },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-medieval mb-4">Bestiary of Monsters</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {monsters.map(monster => (
          <Link key={monster.baseName} href={`/monsters/${encodeURIComponent(monster.baseName)}`}>
            <div className="bg-white/80 rounded shadow p-4 flex flex-col items-center cursor-pointer hover:bg-yellow-50 transition">
              {monster.portrait && (
                <img src={monster.portrait} alt={monster.baseName} className="w-20 h-20 object-contain mb-2" />
              )}
              <div className="font-medieval text-lg text-center text-black">{monster.baseName}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 