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
  let monsterCount = 0;

  for (const obj of gameObjects) {
    const monsterId = parseInt(obj.$.id, 10);
    const name = obj.$.name;
    // Derive baseName by stripping trailing numbers, spaces, and common suffixes (e.g., 'Wolf 1' -> 'Wolf')
    let baseName = name.replace(/\s*\d+$/, '').replace(/\s*\([^)]*\)$/, '').trim();
    // Only process if it has <attribute monster="" /> or group/other monster indicators
    const attrBlocks = obj.AttributeBlock || [];
    const thisBlock = attrBlocks.find(b => b.$.blockName === 'this');
    if (!thisBlock) continue;
    const attrs = thisBlock.attribute || [];
    const isMonster = attrs.some(attr => Object.keys(attr.$).includes('monster'));
    if (!isMonster) continue;

    // Collect main attributes
    let type = null, group = null, native = null, move = null, warning = null, weight = null, fame = null, notoriety = null, gold = null, treasure = null;
    let setupStart = null, vulnerability = null, armored = null;
    for (const attr of attrs) {
      for (const [key, value] of Object.entries(attr.$)) {
        if (key === 'type') type = value;
        if (key === 'group') group = value;
        if (key === 'native') native = value;
        if (key === 'move') move = value;
        if (key === 'warning') warning = value;
        if (key === 'weight') weight = value;
        if (key === 'fame') fame = parseInt(value, 10);
        if (key === 'notoriety') notoriety = parseInt(value, 10);
        if (key === 'gold') gold = parseInt(value, 10);
        if (key === 'treasure') treasure = value;
        if (key === 'setup_start') setupStart = value;
        if (key === 'vulnerability') vulnerability = value;
        if (key === 'armored') {
          if (value === '' || value === undefined) armored = 1;
          else if (!isNaN(parseInt(value, 10))) armored = parseInt(value, 10);
          else armored = 1;
        }
      }
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

    // Contains ids (secondary components)
    let containsIds = null;
    if (obj.contains) {
      const ids = Array.isArray(obj.contains)
        ? obj.contains.map(c => c.$.id)
        : [obj.contains.$.id];
      containsIds = ids.join(',');
    }

    // Portrait path (to be provided later)
    const portrait = `/images/monsters/${name}_portrait.png`;

    // Insert or update monster
    let monster = await prisma.monster.findUnique({ where: { monsterId } });
    if (!monster) {
      monster = await prisma.monster.create({
        data: {
          monsterId,
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
          fame,
          notoriety,
          gold,
          treasure,
          containsIds,
          portrait,
          killCount: 0,
          setupStart,
          vulnerability,
          armored,
        },
      });
      monsterCount++;
      console.log(`Inserted monster: ${name}`);
    } else {
      monster = await prisma.monster.update({
        where: { monsterId },
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
          fame,
          notoriety,
          gold,
          treasure,
          containsIds,
          portrait,
          setupStart,
          vulnerability,
          armored,
        },
      });
      console.log(`Updated monster: ${name}`);
    }
  }
  console.log(`Done. Inserted/updated ${monsterCount} monsters.`);

  // After all monsters are inserted, update containedById for contained monsters
  const allMonsters = await prisma.monster.findMany();
  for (const monster of allMonsters) {
    if (monster.containsIds) {
      const ids = monster.containsIds.split(',').map(id => parseInt(id, 10));
      for (const containedId of ids) {
        try {
          await prisma.monster.update({
            where: { monsterId: containedId },
            data: { containedById: monster.monsterId },
          });
        } catch (e) {
          console.warn(`Warning: Could not set containedById for monsterId ${containedId} (not found)`);
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