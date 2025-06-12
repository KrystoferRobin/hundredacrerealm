const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const xmlPath = path.join(__dirname, '../testing.xml');

async function main() {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  const gameObjects = result.game.objects[0].GameObject;
  let nativeCount = 0;

  // First pass: collect all dwellings by native group
  const nativeToDwelling = {};
  for (const obj of gameObjects) {
    const name = obj.$.name;
    const attrBlocks = obj.AttributeBlock || [];
    const thisBlock = attrBlocks.find(b => b.$.blockName === 'this');
    if (!thisBlock) continue;
    const attrs = thisBlock.attribute || [];
    let native = null;
    for (const attr of attrs) {
      for (const [key, value] of Object.entries(attr.$)) {
        if (key === 'native') native = value;
      }
    }
    if (name.endsWith('Dwelling') && native) {
      nativeToDwelling[native] = name;
    }
  }

  for (const obj of gameObjects) {
    const nativeId = parseInt(obj.$.id, 10);
    const name = obj.$.name;
    // Derive baseName by stripping trailing numbers, spaces, and common suffixes (e.g., 'Woodfolk 1' -> 'Woodfolk')
    let baseName = name.replace(/\s*\d+$/, '').replace(/\s*\([^)]*\)$/, '').trim();
    // Only process if it has <attribute native="" />
    const attrBlocks = obj.AttributeBlock || [];
    const thisBlock = attrBlocks.find(b => b.$.blockName === 'this');
    if (!thisBlock) {
      console.log(`Skipping ${name}: No AttributeBlock with blockName="this"`);
      continue;
    }
    const attrs = thisBlock.attribute || [];
    const isNative = attrs.some(attr => Object.keys(attr.$).includes('native'));
    if (!isNative) {
      console.log(`Skipping ${name}: No native attribute`);
      continue;
    }

    // Collect main attributes
    let type = null, group = null, native = null, move = null, warning = null, weight = null, fame = null, notoriety = null, gold = null, treasure = null;
    let setupStart = null, vulnerability = null, armored = null, dwelling = null, basePrice = null;
    for (const attr of attrs) {
      for (const [key, value] of Object.entries(attr.$)) {
        if (key === 'type') type = value;
        if (key === 'group') group = value;
        if (key === 'native') native = value;
        if (key === 'move') move = value;
        if (key === 'warning') warning = value;
        if (key === 'weight') weight = value;
        if (key === 'fame') fame = value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : 0;
        if (key === 'notoriety') notoriety = value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : 0;
        if (key === 'gold') gold = parseInt(value, 10);
        if (key === 'treasure') treasure = value;
        if (key === 'setup_start') setupStart = value;
        if (key === 'vulnerability') vulnerability = value;
        if (key === 'armored') {
          if (value === '' || value === undefined) armored = 1;
          else if (!isNaN(parseInt(value, 10))) armored = parseInt(value, 10);
          else armored = 1;
        }
        if (key === 'dwelling') dwelling = value;
        if (key === 'base_price') basePrice = value && !isNaN(parseInt(value, 10)) ? parseInt(value, 10) : null;
      }
    }
    // If dwelling is not provided, use the group's dwelling name if available
    if (!dwelling && native && nativeToDwelling[native]) {
      dwelling = nativeToDwelling[native];
    }
    // If still no dwelling, use setupStart as fallback
    if (!dwelling && setupStart) {
      dwelling = setupStart;
    }

    // Light and dark side stats
    let lightMoveSpeed = null, lightAttackSpeed = null, lightStrength = null, lightChitColor = null, lightPins = null;
    let darkMoveSpeed = null, darkAttackSpeed = null, darkStrength = null, darkChitColor = null, darkPins = null;
    for (const block of attrBlocks) {
      if (block.$.blockName === 'light') {
        const lightAttrs = block.attribute || [];
        for (const attr of lightAttrs) {
          for (const [key, value] of Object.entries(attr.$)) {
            if (key === 'move_speed') lightMoveSpeed = value;
            if (key === 'attack_speed') lightAttackSpeed = value;
            if (key === 'strength') lightStrength = value;
            if (key === 'chit_color') lightChitColor = value;
            if (key === 'pins') lightPins = value;
          }
        }
      }
      if (block.$.blockName === 'dark') {
        const darkAttrs = block.attribute || [];
        for (const attr of darkAttrs) {
          for (const [key, value] of Object.entries(attr.$)) {
            if (key === 'move_speed') darkMoveSpeed = value;
            if (key === 'attack_speed') darkAttackSpeed = value;
            if (key === 'strength') darkStrength = value;
            if (key === 'chit_color') darkChitColor = value;
            if (key === 'pins') darkPins = value;
          }
        }
      }
    }

    // Extract per-side stats (Trot, Gallop, etc.)
    const sides = [];
    for (const block of attrBlocks) {
      if (block.$.blockName && block.$.blockName !== 'this') {
        const side = { blockName: block.$.blockName };
        const sideAttrs = block.attribute || [];
        for (const attr of sideAttrs) {
          for (const [key, value] of Object.entries(attr.$)) {
            if (key === 'vulnerability') side.vulnerability = value;
            if (key === 'move_speed') side.moveSpeed = value;
            if (key === 'strength') side.strength = value;
            if (key === 'chit_color') side.chitColor = value;
            if (key === 'move_bonus') side.move_bonus = value;
          }
        }
        sides.push(side);
      }
    }

    // Contains ids (secondary components)
    let containsIds = null;
    if (obj.contains) {
      const ids = Array.isArray(obj.contains)
        ? obj.contains.map(c => c.$.id)
        : [obj.contains.$.id];
      containsIds = ids.join(',');
    }

    // Portrait path (to be provided later)
    const portrait = `/images/natives/${name}_portrait.png`;

    // If this is an item (treasure: 'large' or 'small'), ensure it is in the Item table and skip adding to Native
    if (treasure === 'large' || treasure === 'small') {
      const itemExists = await prisma.item.findUnique({ where: { name } });
      if (!itemExists) {
        await prisma.item.create({
          data: {
            name,
            treasure,
            // Optionally add more fields from native/item attributes as needed
          },
        });
        console.log(`Inserted item from native: ${name}`);
      }
      continue; // Skip adding to Native
    }
    // Skip the dwelling entry itself
    if (name.endsWith('Dwelling')) {
      continue;
    }

    // Insert or update native
    let nativeEntry = await prisma.native.findUnique({ where: { nativeId } });
    if (!nativeEntry) {
      nativeEntry = await prisma.native.create({
        data: {
          nativeId,
          name,
          baseName,
          type,
          group,
          native,
          move,
          lightMoveSpeed,
          lightAttackSpeed,
          lightStrength,
          lightChitColor,
          lightPins,
          darkMoveSpeed,
          darkAttackSpeed,
          darkStrength,
          darkChitColor,
          darkPins,
          warning,
          weight,
          fame: fame !== null && fame !== undefined ? fame : 0,
          notoriety: notoriety !== null && notoriety !== undefined ? notoriety : 0,
          gold,
          treasure,
          containsIds,
          portrait,
          killCount: 0,
          setupStart,
          vulnerability,
          armored,
          dwelling,
          sides: sides.length > 0 ? JSON.stringify(sides) : null,
          description: '',
          strategies: '',
          basePrice,
        },
      });
      nativeCount++;
      console.log(`Inserted native: ${name}`);
    } else {
      nativeEntry = await prisma.native.update({
        where: { nativeId },
        data: {
          name,
          baseName,
          type,
          group,
          native,
          move,
          lightMoveSpeed,
          lightAttackSpeed,
          lightStrength,
          lightChitColor,
          lightPins,
          darkMoveSpeed,
          darkAttackSpeed,
          darkStrength,
          darkChitColor,
          darkPins,
          warning,
          weight,
          fame: fame !== null && fame !== undefined ? fame : 0,
          notoriety: notoriety !== null && notoriety !== undefined ? notoriety : 0,
          gold,
          treasure,
          containsIds,
          portrait,
          setupStart,
          vulnerability,
          armored,
          dwelling,
          sides: sides.length > 0 ? JSON.stringify(sides) : null,
          description: nativeEntry.description || '',
          strategies: nativeEntry.strategies || '',
          basePrice,
        },
      });
      console.log(`Updated native: ${name}`);
    }
  }
  console.log(`Done. Inserted/updated ${nativeCount} natives.`);

  // After all natives are inserted, update containedById for contained natives
  const allNatives = await prisma.native.findMany();
  for (const native of allNatives) {
    if (native.containsIds) {
      const ids = native.containsIds.split(',').map(id => parseInt(id, 10));
      for (const containedId of ids) {
        try {
          await prisma.native.update({
            where: { nativeId: containedId },
            data: { containedById: native.nativeId },
          });
        } catch (e) {
          console.warn(`Warning: Could not set containedById for nativeId ${containedId} (not found)`);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 