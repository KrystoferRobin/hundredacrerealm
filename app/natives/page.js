import prisma from '../../lib/prisma';
import Link from 'next/link';
import React from 'react';

export default async function NativesPage() {
  const natives = await prisma.native.findMany({
    orderBy: { native: 'asc' },
  });

  // Get unique native attributes, ignoring case
  const uniqueNatives = [...new Set(natives.map(n => n.native?.toLowerCase()).filter(Boolean))];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-black">Natives</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniqueNatives.map(native => {
          // Hide Bashkar group if it only contains ponies
          if (native === 'bashkar') {
            // Fetch all entries for this group
            const groupEntries = natives.filter(n => n.native && n.native.toLowerCase() === 'bashkar');
            if (groupEntries.length > 0 && groupEntries.every(n => (n.baseName || n.name).toLowerCase().includes('pony'))) {
              return null;
            }
          }
          return (
            <Link href={`/natives/${native}`} key={native}>
              <div className="border rounded p-4 hover:bg-gray-100 bg-white shadow">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mr-4"></div>
                  <h3 className="text-xl font-bold text-black">{native.charAt(0).toUpperCase() + native.slice(1)}</h3>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 