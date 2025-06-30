'use client';

import { useState, useEffect } from 'react';

interface CharacterAction {
  action: string;
  rawAction: string;
}

interface CharacterData {
  timeline: { [date: string]: CharacterAction[] };
  dailyData: { [date: string]: any };
  characterStats: any;
  gameRelations: any;
}

interface MonthData {
  month: number;
  days: { day: number; actions: CharacterAction[] }[];
}

function parseDate(dateStr: string): { month: number; day: number } {
  const match = dateStr.match(/month_(\d+)_day_(\d+)/);
  if (match) {
    return {
      month: parseInt(match[1]),
      day: parseInt(match[2])
    };
  }
  return { month: 0, day: 0 };
}

function generateActionDescription(action: CharacterAction): string {
  if (action.action.startsWith('Move to ')) {
    return `moved to ${action.action.replace('Move to ', '')}`;
  }
  if (action.action.startsWith('Peer between ')) {
    return `used her keen senses to peer between ${action.action.replace('Peer between ', '')}`;
  }
  switch (action.action) {
    case 'Hide': return 'hid in the shadows';
    case 'Search': return 'searched the area carefully';
    case 'Trade': return 'engaged in trade';
    case 'Rest': return 'rested to recover strength';
    case 'Alert': return 'remained alert and watchful';
    case 'Enchant': return 'cast a powerful enchantment';
    default: return `performed ${action.action.toLowerCase()}`;
  }
}

function organizeByMonths(timeline: { [date: string]: CharacterAction[] }): MonthData[] {
  const monthMap = new Map<number, { day: number; actions: CharacterAction[] }[]>();
  
  // Parse and organize all dates
  Object.entries(timeline).forEach(([dateStr, actions]) => {
    const { month, day } = parseDate(dateStr);
    if (month > 0 && day > 0) {
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push({ day, actions });
    }
  });
  
  // Sort months and days within each month
  const sortedMonths: MonthData[] = [];
  Array.from(monthMap.keys()).sort((a, b) => a - b).forEach(month => {
    const days = monthMap.get(month)!.sort((a, b) => a.day - b.day);
    sortedMonths.push({ month, days });
  });
  
  return sortedMonths;
}

function generateNarrative(characterData: CharacterData): string {
  const { timeline, characterStats } = characterData;
  
  let narrative = `The Woods Girl's journey through the Magic Realm was one of careful exploration and calculated risks. `;
  narrative += `With her natural affinity for the woods and keen survival instincts, she began her adventure with a cautious approach.\n\n`;
  
  const months = organizeByMonths(timeline);
  
  months.forEach((monthData, monthIndex) => {
    // Add month header
    narrative += `=== Month ${monthData.month} ===\n\n`;
    
    monthData.days.forEach(({ day, actions }) => {
      if (actions.length > 0) {
        narrative += `Day ${day}: `;
        
        const actionDescriptions = actions.map(action => generateActionDescription(action));
        narrative += actionDescriptions.join(', then ') + '.\n';
      }
    });
    
    narrative += '\n';
  });
  
  // Add character development summary
  narrative += `Through her travels, the Woods Girl developed a reputation with fame ${characterStats.fame} and notoriety ${characterStats.notoriety}. `;
  narrative += `Her journey through the Magic Realm was marked by careful planning and strategic movement.`;
  
  return narrative;
}

export default function TestNarrativePage() {
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCharacterData() {
      try {
        const response = await fetch('/api/character-narrative');
        if (response.ok) {
          const data = await response.json();
          setCharacterData(data);
        }
      } catch (err) {
        console.error('Failed to load character data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCharacterData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-medieval mb-4">Loading Character Tale...</div>
        </div>
      </div>
    );
  }

  if (!characterData) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-medieval mb-4">No Character Data Found</div>
        </div>
      </div>
    );
  }

  const narrative = generateNarrative(characterData);
  const months = organizeByMonths(characterData.timeline);

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Top Bar */}
      <div className="bg-amber-900 text-amber-100 p-4 border-b-4 border-amber-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-medieval">The Woods Girl's Tale</div>
          <div className="text-sm">A Chronicle of Adventure</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Character Stats Card */}
        <div className="bg-amber-100 border-4 border-amber-800 rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-medieval text-amber-900 mb-4">Character Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-amber-700">Fame</div>
              <div className="text-2xl font-medieval text-amber-900">{characterData.characterStats.fame}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-amber-700">Notoriety</div>
              <div className="text-2xl font-medieval text-amber-900">{characterData.characterStats.notoriety}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-amber-700">Gold</div>
              <div className="text-2xl font-medieval text-amber-900">{characterData.characterStats.gold}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-amber-700">Game Time</div>
              <div className="text-2xl font-medieval text-amber-900">{characterData.characterStats.gameTime}</div>
            </div>
          </div>
        </div>

        {/* Monthly Adventure Log */}
        <div className="space-y-6">
          {months.map((monthData) => (
            <div key={monthData.month} className="bg-amber-100 border-4 border-amber-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-xl font-medieval text-amber-900 mb-4 text-center">
                Month {monthData.month}
              </h3>
              <div className="space-y-2">
                {monthData.days.map(({ day, actions }) => (
                  <div key={day} className="border-l-4 border-amber-600 pl-4 py-2">
                    <div className="font-medieval text-amber-800 mb-1">
                      Day {day}:
                    </div>
                    <div className="text-amber-900">
                      {actions.length > 0 ? (
                        actions.map((action, index) => (
                          <div key={index} className="ml-4 mb-1">
                            • {generateActionDescription(action)}
                          </div>
                        ))
                      ) : (
                        <div className="ml-4 text-amber-600 italic">No recorded actions</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Journey Summary */}
        <div className="bg-amber-100 border-4 border-amber-800 rounded-lg p-6 mt-8 shadow-lg">
          <h3 className="text-xl font-medieval text-amber-900 mb-4">Journey Summary</h3>
          <div className="text-sm text-amber-800">
            <div className="mb-2">
              <strong>Total Months:</strong> {months.length}
            </div>
            <div className="mb-2">
              <strong>Total Days Adventuring:</strong> {Object.keys(characterData.timeline).length}
            </div>
            <div className="mb-2">
              <strong>Total Actions Taken:</strong> {Object.values(characterData.timeline).flat().length}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-amber-900 text-amber-100 p-4 border-t-4 border-amber-700 mt-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-sm">Magic Realm Chronicles</div>
          <div className="text-sm">1979 Avalon Hill</div>
        </div>
      </div>
    </div>
  );
} 