const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const { ZIP_INTERNAL_XML } = require('./constants');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) =>
    [
      'GameObject',
      'AttributeBlock',
      'attribute',
      'attributeList',
      'attributeVal',
      'contains',
      'GameSetup',
    ].includes(tagName),
});

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseAttributeBlock(block) {
  const attrs = {};
  const lists = {};

  for (const attr of asArray(block.attribute)) {
    for (const [key, value] of Object.entries(attr)) {
      if (!key.startsWith('@_')) continue;
      const name = key.slice(2).toLowerCase();
      attrs[name] = value === '' ? true : value;
    }
  }

  for (const list of asArray(block.attributeList)) {
    const keyName = (list['@_keyName'] || '').toLowerCase();
    const values = [];
    for (const val of asArray(list.attributeVal)) {
      for (const [k, v] of Object.entries(val)) {
        if (k.startsWith('@_')) values.push(v);
      }
    }
    lists[keyName] = values;
  }

  return { attrs, lists };
}

function parseGameObject(raw) {
  const blocks = {};
  for (const block of asArray(raw.AttributeBlock)) {
    const blockName = block['@_blockName'];
    blocks[blockName] = parseAttributeBlock(block);
  }

  const childIds = asArray(raw.contains)
    .map((c) => c['@_id'])
    .filter((id) => id != null)
    .map(String);

  return {
    id: String(raw['@_id']),
    name: raw['@_name'] || '',
    blocks,
    childIds,
    parentId: null,
  };
}

function parseGameSetup(raw) {
  const commandTypes = Object.keys(raw).filter((k) => !k.startsWith('@_'));
  return { commandTypes, raw };
}

function parseGameXml(source) {
  const xml =
    typeof source === 'string' && source.trimStart().startsWith('<')
      ? source
      : fs.readFileSync(source, 'utf8');

  const data = parser.parse(xml);
  const game = data.game;
  if (!game) throw new Error('Invalid RealmSpeak save XML: missing <game> root');

  const meta = {
    fileVersion: game['@_file_version'],
    name: game['@_name'],
    description: game['@_description'],
    randomSeed: game['@_rseed'],
    randomCount: game['@_rcount'],
    randomGenerator: game['@_rgtype'],
    randomSetup: game['@_rndSetup'],
  };

  const objects = asArray(game.objects?.GameObject).map(parseGameObject);
  const objectsById = Object.fromEntries(objects.map((o) => [o.id, o]));

  for (const obj of objects) {
    for (const childId of obj.childIds) {
      const child = objectsById[childId];
      if (child && !child.parentId) child.parentId = obj.id;
    }
  }

  const setups = asArray(game.setups?.GameSetup).map((setup) => ({
    name: setup['@_name'],
    ...parseGameSetup(setup),
  }));

  return { meta, objects, objectsById, setups, xml };
}

function extractXmlFromRsgame(rsgamePath, outputDir = null) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(rsgamePath);
  const entry =
    zip.getEntry(ZIP_INTERNAL_XML) ||
    zip.getEntries().find((e) => e.entryName.endsWith('.xml'));

  if (!entry) throw new Error(`No XML in .rsgame archive: ${rsgamePath}`);

  const xml = entry.getData().toString('utf8');
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const outPath = require('path').join(outputDir, 'extracted_game.xml');
    fs.writeFileSync(outPath, xml);
    return outPath;
  }
  return xml;
}

module.exports = { parseGameXml, extractXmlFromRsgame, parseAttributeBlock, asArray };
