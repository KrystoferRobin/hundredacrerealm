import prisma from '../../../lib/prisma';
import dynamic from 'next/dynamic';
import React from 'react';

export async function generateStaticParams() {
  const characters = await prisma.character.findMany({ select: { slug: true } });
  return characters.map(character => ({ slug: character.slug }));
}

const ItemPopover = dynamic(() => import('../../components/ItemPopover'), { ssr: false });

export default async function CharacterPage({ params }) {
  const character = await prisma.character.findUnique({ where: { slug: params.slug } });

  if (!character) {
    return <div>Character not found</div>;
  }

  // Count games featuring this character and times died
  const games = await prisma.game.findMany({
    where: {
      players: {
        some: {
          character: character.name,
        },
      },
    },
    include: {
      players: true,
    },
  });

  const diedCount = games.filter(game => game.players.some(player => player.character === character.name && player.died)).length;

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center mb-4">
        {character.characterSymbol && (
          <img src={character.characterSymbol} alt={`${character.name} symbol`} className="w-20 h-20 mx-auto mb-2" />
        )}
        <div className="flex justify-between items-center w-full">
          <h1 className="text-3xl font-medieval text-black">{character.name}</h1>
          <p className="text-black">{games.length} Adventures: Died {diedCount} times</p>
        </div>
      </div>
      <div className="flex bg-white p-4 rounded shadow relative">
        <div className="w-1/3 flex flex-col items-center">
          {character.characterPortrait && (
            <img src={character.characterPortrait} alt={`${character.name} portrait`} className="w-full h-full object-cover mb-2" />
          )}
          <p className="text-black text-sm text-center">{character.artCredit}</p>
        </div>
        <div className="w-2/3 pl-4 flex flex-col justify-between">
          <div>
            <p className="text-black"><strong>Description:</strong> {character.description}</p>
            <p className="text-black"><strong>Vulnerability:</strong> {character.vulnerability}</p>
            <p className="text-black"><strong>Start Location:</strong> {character.startLocation}</p>
            <p className="text-black"><strong>Icon Meaning:</strong> {character.meaning}</p>
            <p className="text-black"><strong>Advantages:</strong></p>
            <ul className="list-disc pl-5">
              {character.levels && JSON.parse(character.levels).flatMap(lvl => lvl.advantages || []).map((adv, idx) => (
                <li key={idx} className="text-black">{adv}</li>
              ))}
            </ul>
            <p className="text-black"><strong>Starting Items:</strong> {(() => {
              const items = character.startingItems ? JSON.parse(character.startingItems) : [];
              if (!items.length) return null;
              return items.map((item, idx) => (
                <React.Fragment key={item + idx}>
                  <ItemPopover itemName={item}>
                    <span className="underline cursor-pointer">{item}</span>
                  </ItemPopover>{' '}
                </React.Fragment>
              ));
            })()}</p>
            {character.spellcount > 0 && (
              <p className="text-black"><strong>Spell Count:</strong> {character.spellcount}</p>
            )}
            <p className="text-black"><strong>Relationships:</strong></p>
            {character.relationships && (() => {
              const rels = JSON.parse(character.relationships);
              const groups = { Ally: [], Friendly: [], Unfriendly: [], Enemy: [] };
              Object.entries(rels).forEach(([group, value]) => {
                switch (parseInt(value, 10)) {
                  case 2:
                    groups.Ally.push(group.charAt(0).toUpperCase() + group.slice(1));
                    break;
                  case 1:
                    groups.Friendly.push(group.charAt(0).toUpperCase() + group.slice(1));
                    break;
                  case -1:
                    groups.Unfriendly.push(group.charAt(0).toUpperCase() + group.slice(1));
                    break;
                  case -2:
                    groups.Enemy.push(group.charAt(0).toUpperCase() + group.slice(1));
                    break;
                  default:
                    break;
                }
              });
              return (
                <ul className="list-disc pl-5">
                  {Object.entries(groups).map(([type, names]) =>
                    names.length > 0 ? (
                      <li key={type} className="text-black">{type}:  {names.join(', ')}</li>
                    ) : null
                  )}
                </ul>
              );
            })()}
          </div>
          <div className="flex justify-end">
            <p className="text-black text-xs" style={{ fontSize: '0.75rem' }}>{character.creator}</p>
          </div>
        </div>
      </div>
      {/* Levels Panel */}
      <div className="mt-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-medieval mb-2 text-black">Character Levels</h2>
        {character.levels && (
          <div className="space-y-4">
            {JSON.parse(character.levels)
              .sort((a, b) => a.level - b.level)
              .map((level) => (
                <div key={level.level} className="mb-2 text-black">
                  <div><span className="font-semibold">Level {level.level}</span>{level.name ? ` : ${level.name}` : ''}</div>
                  {level.advantages && level.advantages.length > 0 && (
                    <div>Advantages: {level.advantages.join(', ')}</div>
                  )}
                  {level.items && level.items.length > 0 && (
                    <div>Starting Items: {level.items.map((item, idx) => (
                      <React.Fragment key={item + idx}>
                        <ItemPopover itemName={item}>
                          <span className="underline cursor-pointer">{item}</span>
                        </ItemPopover>{' '}
                      </React.Fragment>
                    ))}</div>
                  )}
                  {level.spellcount > 0 && (
                    <div>Spell Count: {level.spellcount}</div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 