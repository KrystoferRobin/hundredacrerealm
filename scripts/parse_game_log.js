const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Get session name from command line argument
const sessionName = process.argv[2];
if (!sessionName) {
  console.error('Usage: node parse_game_log.js <session-name>');
  console.error('Example: node parse_game_log.js learning-woodsgirl');
  process.exit(1);
}

// Configuration based on session name
const LOG_FILE = path.join(__dirname, '..', 'public', 'uploads', `${sessionName}.rslog`);
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'parsed_sessions', sessionName);

console.log(`Processing session: ${sessionName}`);
console.log(`Log file: ${LOG_FILE}`);
console.log(`Output directory: ${OUTPUT_DIR}`);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function decompressLogFile(filePath) {
  try {
    const compressedData = fs.readFileSync(filePath);
    const decompressedData = zlib.inflateSync(compressedData);
    return decompressedData.toString('utf8');
  } catch (error) {
    console.error('Error decompressing log file:', error);
    throw error;
  }
}

function parseLogByDays(logContent) {
  const lines = logContent.split('\n');
  const days = {};
  let currentDay = null;
  let currentDayContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for day markers - the actual format is "Month X, Day Y"
    const dayPatterns = [
      /^Month\s+(\d+),\s*Day\s+(\d+)/i,
      /^Day\s+(\d+)/i,
      /^(\d+)\s*:\s*Day/i,
      /^Week\s+\d+,\s*Day\s+(\d+)/i,
      /^Turn\s+(\d+)/i,
      /^(\d+)\s*:\s*Turn/i
    ];

    let dayMatch = null;
    for (const pattern of dayPatterns) {
      const match = line.match(pattern);
      if (match) {
        dayMatch = match;
        break;
      }
    }

    if (dayMatch) {
      // Save previous day content if we have any
      if (currentDay && currentDayContent.length > 0) {
        days[currentDay] = currentDayContent.join('\n');
      }
      
      // Start new day - handle both "Month X, Day Y" and simple "Day X" formats
      if (dayMatch[2]) {
        // Format: "Month X, Day Y" - use both month and day
        currentDay = `${dayMatch[1]}_${dayMatch[2]}`;
      } else {
        // Format: "Day X" or similar - use just the day number
        currentDay = dayMatch[1];
      }
      currentDayContent = [line];
    } else if (currentDay) {
      // Add line to current day
      currentDayContent.push(line);
    }
  }

  // Don't forget the last day
  if (currentDay && currentDayContent.length > 0) {
    days[currentDay] = currentDayContent.join('\n');
  }

  return days;
}

function saveDaysToFiles(days) {
  console.log(`Found ${Object.keys(days).length} days in the log`);
  
  for (const [dayNumber, content] of Object.entries(days)) {
    const filename = `day_${dayNumber.padStart(2, '0')}.txt`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    fs.writeFileSync(filepath, content);
    console.log(`Saved ${filename} (${content.split('\n').length} lines)`);
  }
}

function main() {
  console.log('Starting game log parser...');
  console.log(`Reading log file: ${LOG_FILE}`);
  
  try {
    // Decompress the log file
    const logContent = decompressLogFile(LOG_FILE);
    console.log(`Decompressed log file (${logContent.length} characters)`);
    
    // Parse by days
    const days = parseLogByDays(logContent);
    
    // Save each day to a separate file
    saveDaysToFiles(days);
    
    // Also save the full decompressed log for reference
    const fullLogPath = path.join(OUTPUT_DIR, 'full_log.txt');
    fs.writeFileSync(fullLogPath, logContent);
    console.log(`Saved full decompressed log to: ${fullLogPath}`);
    
    console.log('Log parsing complete!');
    
  } catch (error) {
    console.error('Error parsing log:', error);
    process.exit(1);
  }
}

main(); 