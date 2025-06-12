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
  let itemCount = 0;

  for (const obj of gameObjects) {
    const name = obj.$.name;
    const attrBlocks = obj.AttributeBlock || [];
    // Find the 'this' block
    const thisBlock = attrBlocks.find(b => b.$.blockName === 'this');
    if (!thisBlock) continue;
    const attrs = thisBlock.attribute || [];
    // Only process if it has <attribute item="" />
    const isItem = attrs.some(attr => Object.keys(attr.$).includes('item'));
    if (!isItem) continue;

    // Collect main attributes for Item columns
    let type = null, vulnerability = null, weight = null, magic = null, length = null, basePrice = null, sharpness = null, iconType = null, fame = null, notoriety = null, text = null, treasure = null;
    for (const attr of attrs) {
      for (const [key, value] of Object.entries(attr.$)) {
        if (key === 'armor' || key === 'weapon' || key === 'shield' || key === 'potion') type = key;
        if (key === 'vulnerability') vulnerability = value;
        if (key === 'weight') weight = value;
        if (key === 'magic') magic = value;
        if (key === 'length') length = value;
        if (key === 'base_price') basePrice = parseInt(value, 10);
        if (key === 'sharpness') sharpness = value;
        if (key === 'icon_type') iconType = value;
        if (key === 'fame') fame = parseInt(value, 10);
        if (key === 'notoriety') notoriety = parseInt(value, 10);
        if (key === 'text') text = value;
        if (key === 'treasure') treasure = value;
      }
    }

    // Insert or update item
    let item = await prisma.item.findUnique({ where: { name } });
    if (!item) {
      item = await prisma.item.create({
        data: {
          name,
          type,
          vulnerability,
          weight,
          magic,
          length,
          basePrice,
          sharpness,
          iconType,
          fame,
          notoriety,
          text,
          treasure,
        },
      });
      itemCount++;
      console.log(`Inserted item: ${name}`);
    } else {
      item = await prisma.item.update({
        where: { name },
        data: {
          type,
          vulnerability,
          weight,
          magic,
          length,
          basePrice,
          sharpness,
          iconType,
          fame,
          notoriety,
          text,
          treasure,
        },
      });
      console.log(`Updated item: ${name}`);
    }

    // Remove old states for this item
    await prisma.itemState.deleteMany({ where: { itemId: item.id } });

    // Collect state blocks (e.g., intact, damaged, alerted, unalerted, etc.)
    for (const block of attrBlocks) {
      if (block.$.blockName !== 'this') {
        const stateAttrs = block.attribute || [];
        let stateData = { state: block.$.blockName, itemId: item.id };
        for (const attr of stateAttrs) {
          for (const [key, value] of Object.entries(attr.$)) {
            if (key === 'strength' || key === 'sharpness' || key === 'chit_color' || key === 'attack_speed' || key === 'base_price' || key === 'vulnerability' || key === 'fame' || key === 'notoriety') {
              let mappedKey = key;
              if (key === 'chit_color') mappedKey = 'color';
              if (key === 'attack_speed') mappedKey = 'attackSpeed';
              if (key === 'base_price') mappedKey = 'basePrice';
              if (key === 'fame') mappedKey = 'fame';
              if (key === 'notoriety') mappedKey = 'notoriety';
              stateData[mappedKey] = (mappedKey === 'basePrice' || mappedKey === 'fame' || mappedKey === 'notoriety') ? parseInt(value, 10) : value;
            }
          }
        }
        await prisma.itemState.create({ data: stateData });
      }
    }
  }
  console.log(`Done. Inserted/updated ${itemCount} items.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 