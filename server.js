const express = require('express');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const SESSIONS_DIR = '/app/public/parsed_sessions';

// Add debug logging for path resolution
console.log('🔍 Server startup - Path resolution:');
console.log(`   Current working directory: ${process.cwd()}`);
console.log(`   Sessions directory: ${SESSIONS_DIR}`);
console.log(`   Sessions directory exists: ${fs.existsSync(SESSIONS_DIR)}`);
console.log(`   Sessions directory absolute: ${path.resolve(SESSIONS_DIR)}`);
console.log(`   User: ${process.env.USER || 'unknown'}`);
console.log(`   UID: ${process.getuid ? process.getuid() : 'unknown'}`);

// Function to wait for volume mount to be ready
function waitForVolumeMount(maxAttempts = 5, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkMount = () => {
      attempts++;
      console.log(`Checking volume mount (attempt ${attempts}/${maxAttempts})...`);
      
      // Try multiple methods to check the directory
      const methods = [
        () => fs.existsSync(SESSIONS_DIR),
        () => fs.accessSync(SESSIONS_DIR, fs.constants.R_OK),
        () => fs.readdirSync(SESSIONS_DIR)
      ];
      
      let exists = false;
      let accessible = false;
      let contents = [];
      
      try {
        exists = methods[0]();
        console.log(`   Directory exists: ${exists}`);
      } catch (error) {
        console.log(`   Directory exists check failed: ${error.message}`);
      }
      
      if (exists) {
        try {
          methods[1]();
          accessible = true;
          console.log(`   Directory accessible: ${accessible}`);
        } catch (error) {
          console.log(`   Directory access check failed: ${error.message}`);
        }
        
        if (accessible) {
          try {
            contents = methods[2]();
            console.log(`   Directory contents: ${contents.length} items`);
            console.log(`   Items: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`);
          } catch (error) {
            console.log(`   Directory read failed: ${error.message}`);
          }
        }
      }
      
      if (exists && accessible) {
        // Resolve if directory exists and is accessible, even if empty
        console.log(`Volume mount ready! Directory ${SESSIONS_DIR} is accessible`);
        resolve();
      } else {
        console.log(`Volume mount not ready yet (attempt ${attempts}/${maxAttempts})`);
        if (attempts >= maxAttempts) {
          console.log(`Volume mount not found after ${maxAttempts} attempts, creating directory...`);
          try {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
            console.log(`Created sessions directory: ${SESSIONS_DIR}`);
            resolve();
          } catch (error) {
            console.error(`Failed to create sessions directory: ${error.message}`);
            reject(new Error(`Volume mount not found and could not create directory after ${maxAttempts} attempts`));
          }
        } else {
          setTimeout(checkMount, delay);
        }
      }
    };
    
    checkMount();
  });
}

// Create Express server independently
const server = express();

// Serve static files from public directory
server.use('/images', express.static(path.join(__dirname, 'public/images')));
server.use('/parchment.jpg', express.static(path.join(__dirname, 'public/parchment.jpg')));

// Express API routes will be defined after Next.js initialization

// Initialize Next.js and then start the server
app.prepare().then(() => {
  // Wait for volume mount to be ready before starting server
  return waitForVolumeMount();
}).then(() => {
  // Handle specific API routes with Express, everything else with Next.js
  server.get('/api/sessions', (req, res) => {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) return res.json({ sessions: [] });
      const items = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
      const sessionFolders = items
        .filter(item => item.isDirectory())
        .filter(item => 
          !item.name.startsWith('.') && 
          !item.name.startsWith('._') && 
          item.name !== '.DS_Store' &&
          item.name !== '.AppleDouble' &&
          item.name !== '.LSOverride'
        )
        .map(item => item.name);
      
      const sessions = [];
      for (const folder of sessionFolders) {
        const sessionPath = path.join(SESSIONS_DIR, folder, 'parsed_session.json');
        if (fs.existsSync(sessionPath)) {
          try {
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            sessions.push({
              id: folder,
              name: sessionData.sessionName || sessionData.session_name || folder,
              date: sessionData.sessionDate || sessionData.session_date || folder,
              players: sessionData.players || [],
            });
          } catch (e) {
            // skip broken session
          }
        }
      }
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  server.get('/api/sessions/:id', (req, res) => {
    try {
      const sessionId = req.params.id;
      const sessionPath = path.join(SESSIONS_DIR, sessionId, 'parsed_session.json');
      if (!fs.existsSync(sessionPath)) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      res.json(sessionData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Game sessions endpoint (used by frontend)
  server.get('/api/game-sessions', (req, res) => {
    try {
      const sessionsDir = SESSIONS_DIR;
      const titlesPath = '/app/data/session_titles.json';
      let sessionTitles = {};
      
      if (fs.existsSync(titlesPath)) {
        sessionTitles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
      }
      
      if (!fs.existsSync(sessionsDir)) {
        return res.json([]);
      }

      const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .filter(item => 
          !item.name.startsWith('.') && 
          !item.name.startsWith('._') && 
          item.name !== '.DS_Store' &&
          item.name !== '.AppleDouble' &&
          item.name !== '.LSOverride'
        )
        .map(dirent => dirent.name);

      const sessions = [];

      for (const folder of sessionFolders) {
        const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
        const mapLocPath = path.join(sessionsDir, folder, 'map_locations.json');
        
        if (fs.existsSync(sessionPath)) {
          try {
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            
            // Get session titles
            const sessionTitle = sessionTitles[folder] || {};
            const mainTitle = sessionTitle.mainTitle || sessionData.sessionName || folder;
            const subtitle = sessionTitle.subtitle || '';

            // Calculate statistics
            let totalCharacterTurns = 0;
            let totalBattles = 0;
            let totalActions = 0;
            const uniqueCharacters = new Set();
            const characters = [];

            // Process days
            const days = Object.keys(sessionData.days || {}).length;
            let battles = 0;

            for (const [dayKey, dayData] of Object.entries(sessionData.days || {})) {
              if (dayData.characterTurns) {
                totalCharacterTurns += Object.keys(dayData.characterTurns).length;
              }
              
              if (dayData.battles) {
                battles += dayData.battles.length;
                totalBattles += dayData.battles.length;
              }
              
              if (dayData.actions) {
                totalActions += dayData.actions.length;
              }
            }

            // Process characters
            for (const [charName, charData] of Object.entries(sessionData.characters || {})) {
              uniqueCharacters.add(charName);
              characters.push(charName);
            }

            // Calculate final day string (e.g. 2m3d)
            const finalDayNum = days > 0 ? days - 1 : 0;
            const months = Math.floor(finalDayNum / 28) + 1;
            const dayNum = (finalDayNum % 28) + 1;
            const finalDay = `${months}m${dayNum}d`;

            // Get file stats for date
            const stats = fs.statSync(sessionPath);
            
            sessions.push({
              id: folder,
              sessionId: folder,
              name: sessionData.sessionName,
              totalCharacterTurns,
              totalBattles,
              totalActions,
              totalTurns: totalCharacterTurns,
              uniqueCharacters: uniqueCharacters.size,
              players: Object.keys(sessionData.players || {}).length,
              lastModified: stats.mtime.toISOString(),
              mainTitle,
              subtitle,
              characters,
              days,
              battles,
              finalDay
            });
          } catch (error) {
            console.error(`Error reading session ${folder}:`, error);
          }
        }
      }

      // Sort by last modified date (newest first)
      sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      // Only return the last 5 sessions
      res.json(sessions.slice(0, 5));
    } catch (error) {
      console.error('Error reading sessions:', error);
      res.status(500).json({ error: 'Failed to load sessions' });
    }
  });
  
  // All other routes handled by Next.js
  server.all('*', (req, res) => handle(req, res));

  const port = process.env.PORT || 3000;
  server.listen(port, err => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}); 