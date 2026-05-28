const fs = require('fs');
const { extractFromXml } = require('./realmspeak');

async function extractMapLocations(xmlPath, outputPath = 'map_locations.json') {
  const extracted = extractFromXml(xmlPath);
  fs.writeFileSync(outputPath, JSON.stringify(extracted.mapLocations, null, 2));
  console.log(`Wrote ${outputPath}`);
  console.log('Summary:', extracted.mapLocations.summary);
  return extracted.mapLocations;
}

module.exports = { extractMapLocations };
