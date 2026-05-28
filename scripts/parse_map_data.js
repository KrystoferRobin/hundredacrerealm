const fs = require('fs');
const { extractFromXml } = require('./realmspeak');

const xmlFile = process.argv[2] || 'extracted_game.xml';

if (!fs.existsSync(xmlFile)) {
  console.error('XML file not found:', xmlFile);
  process.exit(1);
}

const extracted = extractFromXml(xmlFile);
fs.writeFileSync('map_data.json', JSON.stringify(extracted.mapData, null, 2));
console.log(`Wrote map_data.json (${extracted.mapData.tileCount} tiles, source: realmspeak-save)`);
