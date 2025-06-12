import prisma from '../../lib/prisma';
import Link from 'next/link';

export default async function CharactersPage() {
  const characters = await prisma.character.findMany();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-medieval mb-4">Cast of Characters</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {characters.map((character) => (
          <Link href={`/characters/${character.slug}`} key={character.id}>
            <div className="bg-white p-4 rounded shadow hover:shadow-lg transition-shadow aspect-square flex flex-col items-center justify-center">
              {character.characterSymbol && (
                <img src={character.characterSymbol} alt={`${character.name} symbol`} className="w-16 h-16 mx-auto mb-2" />
              )}
              <h2 className="text-xl font-medieval text-center text-black">{character.name}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 