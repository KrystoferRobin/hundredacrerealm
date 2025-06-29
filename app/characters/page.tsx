"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Character {
  id: string;
  name: string;
  source: 'xml' | 'rschar';
  ids?: string[];
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('/api/characters');
        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }
        const data = await response.json();
        setCharacters(data.characters || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load characters');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  // Function to get the character icon path
  const getCharacterIconPath = (characterName: string) => {
    // Convert character name to match the icon naming convention
    const iconName = characterName.replace(/\s+/g, ' ') + '_symbol.png';
    return `/images/charsymbol/${iconName}`;
  };

  // Organize characters by source and sort alphabetically within each group
  const coreGameCharacters = characters
    .filter(char => char.source === 'xml')
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const customCharacters = characters
    .filter(char => char.source === 'rschar')
    .sort((a, b) => a.name.localeCompare(b.name));

  // Function to render character card
  const renderCharacterCard = (character: Character) => (
    <Link 
      key={character.id} 
      href={`/characters/${encodeURIComponent(character.name)}`}
      className="block"
    >
      <div className="bg-[#fff8e1] border-3 border-[#bfa76a] rounded-lg p-6 shadow-lg transition-all duration-200 hover:bg-[#f3e3b2] hover:scale-105 hover:shadow-xl text-[#6b3e26] font-serif relative overflow-hidden group"
           style={{
             boxShadow: '0 4px 16px rgba(191, 167, 106, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
           }}>
        {/* Decorative corner elements */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-[#6b3e26] rounded-tl-md"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-[#6b3e26] rounded-tr-md"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-[#6b3e26] rounded-bl-md"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-[#6b3e26] rounded-br-md"></div>
        
        <div className="flex items-center space-x-4 relative z-10">
          {/* Character Icon */}
          <div className="flex-shrink-0 w-16 h-16 relative">
            <Image
              src={getCharacterIconPath(character.name)}
              alt={`${character.name} symbol`}
              width={64}
              height={64}
              className="object-contain"
              onError={(e) => {
                // Hide the image if it fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          
          {/* Character Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold mb-2 text-[#6b3e26] font-serif truncate">
              {character.name}
            </h3>
            <div className="text-sm text-[#4b3a1e] font-serif">
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                character.source === 'xml' 
                  ? 'bg-[#bfa76a] text-[#6b3e26]' 
                  : 'bg-[#6b3e26] text-[#fff8e1]'
              }`}>
                {character.source === 'xml' ? 'Core Game' : 'Custom'}
              </span>
            </div>
            {character.ids && character.ids.length > 1 && (
              <div className="text-xs text-[#4b3a1e] mt-1 font-serif italic">
                {character.ids.length} variants
              </div>
            )}
          </div>
        </div>
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#bfa76a] to-[#fff8e1] opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-[#6b3e26] mb-4">Loading Characters...</div>
          <div className="w-8 h-8 border-4 border-[#bfa76a] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif text-red-600 mb-4">Error Loading Characters</div>
          <div className="text-[#6b3e26] font-serif">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col flex-1" style={{minHeight: '100vh'}}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Characters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {coreGameCharacters.map(renderCharacterCard)}
            {customCharacters.map(renderCharacterCard)}
          </div>

          {/* Summary */}
          <div className="text-center mt-8">
            <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-4 inline-block">
              <p className="text-[#6b3e26] font-serif">
                <span className="font-bold">{characters.length}</span> characters available
                <br />
                <span className="text-sm">
                  <span className="font-semibold">{coreGameCharacters.length}</span> Core Game • 
                  <span className="font-semibold"> {customCharacters.length}</span> Custom
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 