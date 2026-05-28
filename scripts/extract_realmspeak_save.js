#!/usr/bin/env node
/**
 * Extract map, locations, characters, and setup-card state from a RealmSpeak save
 * using the same XML structure as GameData.java / GameObject.java.
 */
const fs = require('fs');
const path = require('path');
const {
  extractFromXml,
  extractFromRsgame,
  writeSessionOutputs,
} = require('./realmspeak');

function runExtraction(extracted, outputDir) {
  writeSessionOutputs(outputDir, extracted);
  console.log('Wrote map_data.json, map_locations.json, game_state.json');
  console.log('Summary:', extracted.mapLocations.summary);
}

const input = process.argv[2];
const outputDir = process.argv[3] || process.cwd();

if (input) {
  if (input.endsWith('.rsgame')) {
    runExtraction(extractFromRsgame(input, outputDir), outputDir);
  } else {
    runExtraction(extractFromXml(input), outputDir);
  }
  process.exit(0);
}

const xml = path.join(outputDir, 'extracted_game.xml');
const rsgame = fs.readdirSync(outputDir).find((f) => f.endsWith('.rsgame'));

if (fs.existsSync(xml)) {
  runExtraction(extractFromXml(xml), outputDir);
  process.exit(0);
}

if (rsgame) {
  runExtraction(extractFromRsgame(path.join(outputDir, rsgame), outputDir), outputDir);
  process.exit(0);
}

console.error('Usage: node extract_realmspeak_save.js [path/to.rsgame|.xml] [outputDir]');
console.error('  Or run from a session folder with extracted_game.xml or a .rsgame file.');
process.exit(1);
