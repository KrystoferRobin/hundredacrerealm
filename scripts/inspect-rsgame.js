const AdmZip = require('adm-zip');
const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/inspect-rsgame.js <file.rsgame> [...]');
  process.exit(1);
}

for (const file of files) {
  const zip = new AdmZip(file);
  console.log(`\n=== ${file} ===`);
  zip.getEntries().forEach((e) => console.log(`  ${e.entryName} (${e.header.size} bytes)`));

  const xmlEntries = zip.getEntries().filter((e) => e.entryName.endsWith('.xml'));
  const main =
    xmlEntries.find((e) => e.entryName.includes('CHEATER')) || xmlEntries[0];
  if (!main) {
    console.log('  No XML in archive');
    continue;
  }

  const content = main.getData().toString('utf8');
  console.log(`  Main XML: ${main.entryName}`);
  console.log(`  Size: ${content.length} chars`);
  console.log(`  GameObjects: ${(content.match(/<GameObject /g) || []).length}`);
  console.log(`  mapGrid blocks: ${(content.match(/blockName="mapGrid"/g) || []).length}`);
  console.log(`  setups section: ${content.includes('<setups>')}`);
  console.log(`  GameSetup elements: ${(content.match(/<GameSetup[\s>]/g) || []).length}`);

  const gameMatch = content.match(/<game[^>]*>/);
  if (gameMatch) console.log(`  game tag: ${gameMatch[0]}`);
}
