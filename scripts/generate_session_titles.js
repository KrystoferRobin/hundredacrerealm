const fs = require('fs');
const path = require('path');
const { generateSessionName } = require('./generate_session_name.js');

async function generateAllSessionTitles() {
  try {
    console.log('Generating session titles for all sessions...');
    
    const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
    
    if (!fs.existsSync(sessionsDir)) {
      console.error('No sessions directory found');
      return;
    }
    
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
    
    // Write session titles to stats directory
    const statsDir = path.join(process.cwd(), 'public', 'stats');
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
    
    const outputPath = path.join(statsDir, 'session_titles.json');
    fs.writeFileSync(outputPath, JSON.stringify(sessionTitles, null, 2));
    
    console.log(`\nGenerated ${Object.keys(sessionTitles).length} session titles`);
    console.log(`Output written to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating session titles:', error);
  }
}

// Also support generating title for current session when called from within a session directory
async function generateCurrentSessionTitle() {
  try {
    console.log('Generating session title for current session...');
    
    // Check if we're in a session directory
    const currentDir = process.cwd();
    const sessionDataPath = path.join(currentDir, 'parsed_session.json');
    const mapLocationsPath = path.join(currentDir, 'map_locations.json');
    const finalScoresPath = path.join(currentDir, 'final_scores.json');
    
    if (!fs.existsSync(sessionDataPath)) {
      console.log('Not in a session directory, generating all session titles...');
      return generateAllSessionTitles();
    }
    
    console.log(`Processing current session in: ${currentDir}`);
    
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
    
    // Save to current directory
    const sessionTitle = {
      mainTitle: sessionName.mainTitle,
      subtitle: sessionName.subtitle,
      characters: sessionName.characters,
      days: sessionName.days,
      battles: sessionName.battles
    };
    
    const outputPath = path.join(currentDir, 'session_titles.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(sessionTitle, null, 2));

    if (sessionData && !sessionData.sessionTitle) {
      sessionData.sessionTitle = sessionName.mainTitle;
      fs.writeFileSync(sessionDataPath, JSON.stringify(sessionData, null, 2));
    }

    console.log(`Generated: "${sessionName.mainTitle}" - "${sessionName.subtitle}"`);
    console.log(`Output written to: ${outputPath}`);

    // Refresh global index when run from project root
    if (fs.existsSync(path.join(process.cwd(), 'public', 'parsed_sessions'))) {
      await generateAllSessionTitles();
    }
    
  } catch (error) {
    console.error('Error generating current session title:', error);
  }
}

// Run the appropriate function based on context
if (require.main === module) {
  generateCurrentSessionTitle();
} 