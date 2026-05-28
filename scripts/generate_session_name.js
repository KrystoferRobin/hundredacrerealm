const fs = require('fs');
const path = require('path');

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function titleCase(str) {
    // Preserve lowercase 's in possessives by temporarily replacing them
    str = str.replace(/'s/g, '___POSSESSIVE___');
    str = str.replace(/\b\w/g, c => c.toUpperCase());
    str = str.replace(/___POSSESSIVE___/g, "'s");
    return str;
}

function generateSessionName(sessionData, mapLocations, finalScores) {
    try {
        // Extract key data from session
        const characters = new Set();
        const discoveries = new Set();
        const locations = new Set();
        const treasures = new Set();
        const spells = new Set();
        const battles = [];
        const trades = [];
        const hires = [];
        
        // Analyze each day
        Object.values(sessionData.days).forEach(day => {
            if (day.characterTurns) {
                day.characterTurns.forEach(turn => {
                    characters.add(turn.character);
                    
                    turn.actions.forEach(action => {
                        // Track discoveries
                        if (action.action.includes('Found') || action.action.includes('Found Treasure')) {
                            const found = action.result.replace('Found ', '');
                            if (found !== 'Nothing') {
                                discoveries.add(found);
                            }
                        }
                        
                        // Track locations
                        if (turn.startLocation) {
                            const location = turn.startLocation.split(' ')[0];
                            locations.add(location);
                        }
                        
                        // Track spells
                        if (action.action.includes('Learn') || action.action.includes('Awaken')) {
                            spells.add('Spell Learning');
                        }
                        
                        // Track trades
                        if (action.action.includes('Trade') || action.action.includes('Trades')) {
                            trades.push(action.result);
                        }
                        
                        // Track hires
                        if (action.action.includes('Hire')) {
                            hires.push(action.result);
                        }
                    });
                });
            }
            
            // Track battles
            if (day.battles && day.battles.length > 0) {
                battles.push(...day.battles);
            }
        });
        
        // Extract treasures from map locations
        if (mapLocations && mapLocations.treasure) {
            mapLocations.treasure.forEach(item => {
                treasures.add(item.name);
            });
        }
        
        // Convert to arrays and filter
        const characterArray = Array.from(characters).filter(c => !c.includes('HQ'));
        const discoveryArray = Array.from(discoveries);
        const locationArray = Array.from(locations);
        const treasureArray = Array.from(treasures);
        const spellArray = Array.from(spells);
        
        // Find the most significant character (one with most actions or discoveries)
        let mainCharacter = characterArray[0] || 'Adventurer';
        let mainDiscovery = null;
        let mainLocation = null;
        
        // Find most valuable discovery
        const valuableItems = ['Dragon Essence', 'Sacred Grail', 'Regent of Jewels', 'Flowers of Rest'];
        for (const item of valuableItems) {
            if (discoveryArray.includes(item)) {
                mainDiscovery = item;
                break;
            }
        }
        
        // If no valuable items found, use first discovery or treasure
        if (!mainDiscovery) {
            if (discoveryArray.length > 0) {
                mainDiscovery = discoveryArray[0];
            } else if (treasureArray.length > 0) {
                mainDiscovery = treasureArray[0];
            } else {
                mainDiscovery = 'Treasure';
            }
        }
        
        // Find most significant location (where most time was spent)
        const locationCounts = {};
        Object.values(sessionData.days).forEach(day => {
            if (day.characterTurns) {
                day.characterTurns.forEach(turn => {
                    if (turn.startLocation) {
                        const location = turn.startLocation.split(' ')[0];
                        locationCounts[location] = (locationCounts[location] || 0) + 1;
                    }
                });
            }
        });
        
        const sortedLocations = Object.entries(locationCounts)
            .sort(([,a], [,b]) => b - a);
        mainLocation = sortedLocations[0] ? sortedLocations[0][0] : 'Realm';
        
        // --- SCORING-BASED TITLE LOGIC ---
        let scoringTitle = '';
        let scoringSubtitle = '';
        let scoringChar = null;
        let scoringScore = null;
        let scoringLocation = null;
        if (finalScores) {
            // Find highest scoring character
            let maxScore = -Infinity;
            let maxChar = null;
            let allScores = [];
            
            // First, collect all valid scores
            for (const [char, data] of Object.entries(finalScores)) {
                if (typeof data.totalScore === 'number') {
                    allScores.push({ char, score: data.totalScore });
                }
            }
            
            if (allScores.length > 0) {
                // Check if all scores are negative
                const allNegative = allScores.every(({ score }) => score < 0);
                
                if (allNegative) {
                    // If all scores are negative, find the one closest to zero (least negative)
                    let closestToZero = allScores[0];
                    for (const scoreData of allScores) {
                        if (scoreData.score > closestToZero.score) { // Closer to zero
                            closestToZero = scoreData;
                        }
                    }
                    maxScore = closestToZero.score;
                    maxChar = closestToZero.char;
                } else {
                    // If there are positive scores, find the highest positive score
                    for (const scoreData of allScores) {
                        if (scoreData.score > maxScore) {
                            maxScore = scoreData.score;
                            maxChar = scoreData.char;
                        }
                    }
                }
            }
            
            if (maxChar) {
                scoringChar = maxChar;
                scoringScore = maxScore;
                // Find most visited location for this character
                const charLocCounts = {};
                Object.values(sessionData.days).forEach(day => {
                    if (day.characterTurns) {
                        day.characterTurns.forEach(turn => {
                            if (turn.character === scoringChar && turn.startLocation) {
                                const location = turn.startLocation.split(' ')[0];
                                charLocCounts[location] = (charLocCounts[location] || 0) + 1;
                            }
                        });
                    }
                });
                const sortedCharLocs = Object.entries(charLocCounts).sort(([,a],[,b]) => b - a);
                scoringLocation = sortedCharLocs[0] ? sortedCharLocs[0][0] : mainLocation;
                // Generate scoring-based title
                if (scoringScore > 0) {
                    // Epic/Heroic
                    const epicWords = ['Epic Triumph', 'Legendary Feat', 'Glorious Raid', 'Heroic Victory', 'Fabled Exploit', 'Triumphant Quest', 'Grand Adventure', 'Vault Raid', 'Saga of Glory', 'Crowning Achievement'];
                    scoringTitle = `${scoringChar}'s ${randomChoice(epicWords)}`;
                    scoringSubtitle = `A tale of valor in the ${scoringLocation}`;
                } else if (scoringScore === 0) {
                    // Neutral
                    const neutralWords = ['Passage', 'Journey', 'Sojourn', 'Wanderings', 'Borderland Passage', 'Realm Trek', 'Wandering', 'Pilgrimage', 'Expedition', 'Adventure'];
                    scoringTitle = `${scoringChar}'s ${randomChoice(neutralWords)}`;
                    scoringSubtitle = `A story of survival in the ${scoringLocation}`;
                } else {
                    // Failure/Misfortune
                    const failWords = ['Misfortune', 'Folly', 'Disaster', 'Downfall', 'Tragedy', 'Calamity', 'Debacle', 'Ruin', 'Woe', 'Lost Hope', 'Ill Fate', 'Doom', 'Collapse', 'Despair', 'Defeat'];
                    scoringTitle = `${scoringChar}'s ${randomChoice(failWords)}`;
                    scoringSubtitle = `A tale of hardship and loss in the ${scoringLocation}`;
                }
            }
        }
        // --- GENERIC TITLE LOGIC (as before) ---
        const questWords = [
            'Quest', 'Adventure', 'Expedition', 'Journey', 'Saga', 'Odyssey', 'Campaign', 
            'Foray', 'Pursuit', 'Pilgrimage', 'Chronicle', 'Legend', 'Tale', 'Voyage', 
            'Exploration', 'Mission', 'Operation', 'Trial', 'Test', 'Ordeal', 'Challenge', 
            'Conquest', 'Triumph', 'Episode', 'Affair', 'Incident', 'Encounter', 'Exploit', 
            'Mystery', 'Search', 'Hunt', 'Escapade', 'Venture', 'Story', 'Account', 'Record', 
            'Memoir', 'Annals', 'Reckoning', 'Revelation', 'Discovery', 'Unveiling', 
            'Reclamation', 'Retrieval', 'Rescue', 'Liberation', 'Uncovering', 'Revelry', 
            'Bounty', 'Hoard', 'Boon', 'Prize', 'Fortune', 'Glory', 'Feud', 'Conflict', 
            'Battle', 'Showdown', 'Clash', 'Duel', 'Skirmish', 'Rumble', 'Fable', 'Myth', 
            'Epic', 'Ballad', 'Song', 'Yarn', 'History', 'Legacy', 'Heritage', 'Inheritance'
        ];
        
        const adjectives = [
            'Lost', 'Hidden', 'Forgotten', 'Cursed', 'Golden', 'Ancient', 'Secret', 
            'Fabled', 'Legendary', 'Enchanted', 'Haunted', 'Mysterious', 'Forbidden', 
            'Sacred', 'Perilous', 'Dreaded', 'Glorious', 'Epic', 'Heroic', 'Dark', 
            'Shattered', 'Broken', 'Eternal', 'Final', 'First', 'Last', 'Great', 'Grand', 
            'Wild', 'Wicked', 'Brave', 'Bold', 'Noble', 'Valiant', 'Fearless', 'Daring', 
            'Gallant', 'Mighty', 'Savage', 'Ruthless', 'Merciless', 'Relentless', 
            'Unyielding', 'Unstoppable', 'Unbreakable', 'Unbeatable', 'Unconquerable', 
            'Invincible', 'Immortal', 'Undying', 'Unending', 'Unfading', 'Unforgettable'
        ];
        
        const groupWords = [
            'Brotherhood', 'Company', 'Fellowship', 'Order', 'Society', 'Club', 'Circle', 
            'Coterie', 'Set', 'Clique', 'Gang', 'Mob', 'Pack', 'Horde', 'Swarm', 'Throng', 
            'Crowd', 'Multitude', 'Host', 'Army', 'Legion', 'Force', 'Troop', 'Squad', 
            'Platoon', 'Unit', 'Detachment', 'Division', 'Brigade', 'Regiment', 'Battalion', 
            'Corps', 'Command', 'Formation', 'Fleet', 'Flotilla', 'Squadron', 'Wing', 'Team', 
            'Crew', 'Band', 'Party', 'Alliance', 'Coalition', 'Union', 'Association', 
            'Organization', 'Guild', 'Coven', 'Cabal', 'Syndicate', 'Cartel', 'Consortium'
        ];
        
        // --- TITLE TEMPLATES ---
        const mainTitleTemplates = [
            `${mainCharacter}'s ${randomChoice(questWords)}`,
            `The ${mainLocation} ${randomChoice(questWords)}`,
            `${mainCharacter} and the ${mainDiscovery}`,
            `The ${randomChoice(adjectives)} ${mainDiscovery}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `Tale of the ${mainDiscovery}`,
            `Chronicles of ${mainCharacter}`,
            `The ${mainLocation} ${randomChoice(groupWords)}`,
            `${mainCharacter}'s ${mainLocation} ${randomChoice(questWords)}`,
            `The ${mainDiscovery} of ${mainLocation}`,
            `Saga of the ${mainLocation}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${mainLocation}`,
            `The ${mainLocation} ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${mainDiscovery}`,
            `The ${mainLocation} ${randomChoice(questWords)} of ${mainCharacter}`,
            `Realm of the ${mainDiscovery}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `The ${mainDiscovery} ${randomChoice(questWords)}`,
            `${mainCharacter} and the ${randomChoice(adjectives)} ${mainLocation}`,
            `The ${randomChoice(adjectives)} ${mainLocation} ${randomChoice(questWords)}`
        ];
        
        const subtitleTemplates = [
            `The ${mainLocation} ${randomChoice(questWords)}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `Tale of the ${mainLocation}`,
            `${mainCharacter}'s ${mainLocation} ${randomChoice(questWords)}`,
            `The ${mainLocation} ${randomChoice(groupWords)}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${mainLocation}`,
            `Realm of the ${mainLocation}`,
            `${mainCharacter}'s ${randomChoice(questWords)}`,
            `The ${mainLocation} ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `${mainCharacter}'s ${mainLocation} ${randomChoice(questWords)}`,
            `The ${mainDiscovery} ${randomChoice(questWords)}`,
            `${mainCharacter} and the ${mainLocation}`,
            `The ${randomChoice(adjectives)} ${mainLocation}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `The ${mainLocation} ${randomChoice(adjectives)} ${randomChoice(questWords)}`,
            `${mainCharacter}'s ${randomChoice(adjectives)} ${mainLocation}`,
            `The ${mainLocation} ${randomChoice(questWords)} of ${mainCharacter}`,
            `${mainCharacter} and the ${randomChoice(adjectives)} ${mainDiscovery}`,
            `The ${mainDiscovery} of ${mainLocation}`,
            `${mainCharacter}'s ${mainLocation} ${randomChoice(adjectives)} ${randomChoice(questWords)}`
        ];
        
        // Select main title and subtitle (avoiding duplicates)
        let mainTitle = randomChoice(mainTitleTemplates);
        let subtitle = scoringTitle ? scoringTitle : randomChoice(mainTitleTemplates);
        
        // Add flourish to subtitle if scoringSubtitle is available
        if (scoringSubtitle) {
            subtitle = `${subtitle} — ${scoringSubtitle}`;
        }
        
        // Capitalize
        mainTitle = titleCase(mainTitle);
        subtitle = titleCase(subtitle);
        
        return {
            mainTitle,
            subtitle,
            characters: characterArray.length,
            days: Object.keys(sessionData.days).length,
            battles: battles.length
        };
        
    } catch (error) {
        console.error('Error generating session name:', error);
        return {
            mainTitle: 'Tale of the Realm',
            subtitle: 'An Adventure in Magic Realm',
            characters: 0,
            days: 0,
            battles: 0
        };
    }
}

module.exports = { generateSessionName }; 