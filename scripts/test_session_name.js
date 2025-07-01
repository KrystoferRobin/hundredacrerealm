const { generateSessionName } = require('./generate_session_name.js');
const fs = require('fs');

async function testSessionName() {
    try {
        // Load 5man session data
        const sessionData = JSON.parse(fs.readFileSync('parsed_sessions/5man/parsed_session.json', 'utf8'));
        const mapLocations = JSON.parse(fs.readFileSync('parsed_sessions/5man/map_locations.json', 'utf8'));
        
        const result = generateSessionName(sessionData, mapLocations);
        
        console.log('Generated Session Name for 5man:');
        console.log('================================');
        console.log(`Main Title: ${result.mainTitle}`);
        console.log(`Subtitle: ${result.subtitle}`);
        console.log(`Characters: ${result.characters}`);
        console.log(`Days: ${result.days}`);
        console.log(`Battles: ${result.battles}`);
        
        // Calculate final day (minus 1)
        const finalDay = result.days > 0 ? result.days - 1 : 0;
        const months = Math.floor(finalDay / 28) + 1;
        const days = (finalDay % 28) + 1;
        const dayString = `${months}m${days}d`;
        
        console.log(`\nDisplay Format:`);
        console.log(`${result.mainTitle}`);
        console.log(`(${result.subtitle})`);
        console.log(`${result.characters} characters, ${result.days} turns, ${result.battles} battles`);
        console.log(`Final day: ${dayString}`);
        
    } catch (error) {
        console.error('Error testing session name:', error);
    }
}

testSessionName(); 