const fs = require('fs');
const path = require('path');
const { generateSessionName } = require('./generate_session_name.js');

async function generateAllSessionTitles() {
  try {
    console.log('Generating session titles for all sessions...');
    
    // Read all session data
    const sessionsDir = path.join(__dirname, '..', 'parsed_sessions');
    const sessionTitles = {};
    
    const sessionFolders = fs.readdirSync(sessionsDir).filter(folder => 
      fs.statSync(path.join(sessionsDir, folder)).isDirectory()
    );
    
    console.log(`Found ${sessionFolders.length} session folders`);
    
    for (const sessionFolder of sessionFolders) {
      const sessionPath = path.join(sessionsDir, sessionFolder);
      const sessionId = sessionFolder;
      
      console.log(`Processing session: ${sessionId}`);
      
      // Read session data
      const sessionDataPath = path.join(sessionPath, 'parsed_session.json');
      const mapLocationsPath = path.join(sessionPath, 'map_locations.json');
      const finalScoresPath = path.join(sessionPath, 'final_scores.json');
      
      if (!fs.existsSync(sessionDataPath)) {
        console.log(`  Skipping ${sessionId} - no parsed_session.json`);
        continue;
      }
      
      const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
      let mapLocations = null;
      let finalScores = null;
      
      if (fs.existsSync(mapLocationsPath)) {
        mapLocations = JSON.parse(fs.readFileSync(mapLocationsPath, 'utf8'));
      }
      
      if (fs.existsSync(finalScoresPath)) {
        finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
      }
      
      // Generate session name
      const sessionName = generateSessionName(sessionData, mapLocations, finalScores);
      
      sessionTitles[sessionId] = {
        mainTitle: sessionName.mainTitle,
        subtitle: sessionName.subtitle,
        characters: sessionName.characters,
        days: sessionName.days,
        battles: sessionName.battles
      };
      
      console.log(`  Generated: "${sessionName.mainTitle}" - "${sessionName.subtitle}"`);
    }
    
    // Write session titles to data directory
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const outputPath = path.join(dataDir, 'session_titles.json');
    fs.writeFileSync(outputPath, JSON.stringify(sessionTitles, null, 2));
    
    console.log(`\nGenerated ${Object.keys(sessionTitles).length} session titles`);
    console.log(`Output written to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating session titles:', error);
  }
}

generateAllSessionTitles(); 