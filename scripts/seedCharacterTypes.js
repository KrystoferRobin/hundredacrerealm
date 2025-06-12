const fs = require('fs');
const xml2js = require('xml2js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const xml = fs.readFileSync('testing.xml', 'utf8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);

  const gameObjects = result.game.objects[0].GameObject;
  let count = 0;

  for (const obj of gameObjects) {
    const name = obj.$.name;
    const id = obj.$.id;
    const attrBlocks = obj.AttributeBlock || [];
    let isCharacter = false;
    let iconFolder = null;
    let characterChit = null;
    let stage = null;
    let description = null;

    for (const block of attrBlocks) {
      const attrs = block.attribute || [];
      for (const attr of attrs) {
        if (attr.$.icon_folder === 'custom/characters') {
          isCharacter = true;
          iconFolder = attr.$.icon_folder;
        }
        if (attr.$.character_chit !== undefined) {
          characterChit = attr.$.character_chit;
        }
        if (attr.$.stage !== undefined) {
          stage = parseInt(attr.$.stage, 10);
        }
        if (attr.$.description !== undefined) {
          description = attr.$.description;
        }
      }
    }

    if (isCharacter) {
      // Only insert if not already present
      const existing = await prisma.characterType.findUnique({ where: { name } });
      if (!existing) {
        await prisma.characterType.create({
          data: {
            name,
            description,
            iconFolder,
            characterChit,
            stage,
          },
        });
        count++;
        console.log(`Inserted character: ${name}`);
      }
    }
  }
  console.log(`Done. Inserted ${count} new character types.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 