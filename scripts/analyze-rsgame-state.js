const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/analyze-rsgame-state.js <file.rsgame>');
  process.exit(1);
}

const zip = new AdmZip(file);
const entry =
  zip.getEntries().find((e) => e.entryName.includes('CHEATER')) ||
  zip.getEntries().find((e) => e.entryName.endsWith('.xml'));
const xml = entry.getData().toString('utf8');
const data = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);

const objects = data.game?.objects?.GameObject;
const list = Array.isArray(objects) ? objects : objects ? [objects] : [];

const stats = {
  total: list.length,
  withMapGrid: 0,
  withMapPosition: 0,
  withClearing: 0,
  withPlayerBlock: 0,
  blockNames: {},
  objectTypes: { tile: 0, character: 0, monster: 0, native: 0, chit: 0, other: 0 },
};

for (const obj of list) {
  const blocks = obj.AttributeBlock
    ? Array.isArray(obj.AttributeBlock)
      ? obj.AttributeBlock
      : [obj.AttributeBlock]
    : [];

  let hasMapGrid = false;
  let hasMapPosition = false;
  let hasClearing = false;
  let hasPlayer = false;

  for (const block of blocks) {
    const name = block['@_blockName'] || '?';
    stats.blockNames[name] = (stats.blockNames[name] || 0) + 1;
    if (name === 'mapGrid') hasMapGrid = true;
    if (name === 'RS_PB__') hasPlayer = true;

    const attrs = block.attribute
      ? Array.isArray(block.attribute)
        ? block.attribute
        : [block.attribute]
      : [];
    for (const attr of attrs) {
      if (attr['@_mapposition']) hasMapPosition = true;
      if (attr['@_clearing']) hasClearing = true;
    }
  }

  if (hasMapGrid) stats.withMapGrid++;
  if (hasMapPosition) stats.withMapPosition++;
  if (hasClearing) stats.withClearing++;
  if (hasPlayer) stats.withPlayerBlock++;

  const thisBlock = blocks.find((b) => b['@_blockName'] === 'this');
  const attrs = thisBlock?.attribute
    ? Array.isArray(thisBlock.attribute)
      ? thisBlock.attribute
      : [thisBlock.attribute]
    : [];
  const keys = new Set(attrs.map((a) => Object.keys(a).filter((k) => k !== '@_')[0]).flat());
  if (keys.has('tile') || keys.has('tile_type')) stats.objectTypes.tile++;
  else if (keys.has('character')) stats.objectTypes.character++;
  else if (keys.has('monster')) stats.objectTypes.monster++;
  else if (keys.has('native') || keys.has('dwelling')) stats.objectTypes.native++;
  else if (keys.has('warning') || keys.has('sound') || keys.has('treasure_location'))
    stats.objectTypes.chit++;
  else stats.objectTypes.other++;
}

const setups = data.game?.setups;
const setupList = setups?.GameSetup
  ? Array.isArray(setups.GameSetup)
    ? setups.GameSetup
    : [setups.GameSetup]
  : [];

console.log(JSON.stringify({ file, mainXml: entry.entryName, stats, setupNames: setupList.map((s) => s['@_name']) }, null, 2));
