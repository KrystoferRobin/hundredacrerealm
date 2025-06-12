const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const charsDir = '/Users/krystoferrobin/Downloads/RealmSpeak1221/characters';

async function main() {
  const files = fs.readdirSync(charsDir).filter(f => f.endsWith('.rschar'));
  let charCount = 0;
  let chitCount = 0;

  for (const file of files) {
    const charName = path.basename(file, '.rschar');
    // Generate slug: lowercase, replace spaces and non-alphanumerics with hyphens
    const slug = charName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const zipPath = path.join(charsDir, file);
    const zip = new AdmZip(zipPath);
    const xmlEntry = zip.getEntries().find(e => e.entryName.endsWith('.xml'));
    if (!xmlEntry) {
      console.warn(`No XML found in ${file}`);
      continue;
    }
    const xml = xmlEntry.getData().toString('utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    const gameObjects = result.game.objects[0].GameObject;
    // Find GameObject id="0" (the character)
    const charObj = gameObjects.find(obj => obj.$.id === '0');
    if (!charObj) {
      console.warn(`No GameObject id=0 in ${file}`);
      continue;
    }
    // Extract static character info
    let description = null;
    let iconFolder = null;
    let characterChit = null;
    let stage = null;
    let vulnerability = null;
    let startLocation = null;
    let pronoun = null;
    let facing = null;
    let meaning = null;
    let creator = null;
    let artCredit = null;
    let advantages = [];
    let startingItems = [];
    let levels = [];
    let relationships = {};
    let totalSpellcount = 0;

    const attrBlocks = charObj.AttributeBlock || [];
    for (const block of attrBlocks) {
      const attrs = block.attribute || [];
      for (const attr of attrs) {
        if (attr.$.description !== undefined) description = attr.$.description;
        if (attr.$.icon_folder !== undefined) iconFolder = attr.$.icon_folder;
        if (attr.$.character_chit !== undefined) characterChit = attr.$.character_chit;
        if (attr.$.stage !== undefined) stage = parseInt(attr.$.stage, 10);
        if (attr.$.vulnerability !== undefined) vulnerability = attr.$.vulnerability;
        if (attr.$.start !== undefined) startLocation = attr.$.start;
        if (attr.$.pronoun !== undefined) pronoun = attr.$.pronoun;
        if (attr.$.facing !== undefined) facing = attr.$.facing;
        if (attr.$.meaning !== undefined) meaning = attr.$.meaning;
        if (attr.$.creator !== undefined) creator = attr.$.creator;
        if (attr.$.artcredit !== undefined) artCredit = attr.$.artcredit;
      }
    }

    // Extract advantages and starting items
    for (const block of attrBlocks) {
      if (/^level_\d+$/.test(block.$.blockName)) {
        const levelNum = parseInt(block.$.blockName.replace('level_', ''), 10);
        let levelName = null;
        let levelItems = [];
        let levelAdvantages = [];
        let levelSpellcount = 0;
        const attrs = block.attribute || [];
        for (const attr of attrs) {
          if (attr.$.name !== undefined) levelName = attr.$.name;
          if (attr.$.weapon !== undefined) {
            attr.$.weapon.split(',').map(s => s.trim()).forEach(w => { if (w) levelItems.push(w); });
          }
          if (attr.$.armor !== undefined) {
            attr.$.armor.split(',').map(s => s.trim()).forEach(a => { if (a) levelItems.push(a); });
          }
          if (attr.$.spellcount !== undefined) {
            const val = parseInt(attr.$.spellcount, 10);
            if (!isNaN(val)) {
              levelSpellcount += val;
              totalSpellcount += val;
            }
          }
        }
        // Only keep Level 4 items for main panel
        if (levelNum === 4) {
          startingItems = [...levelItems];
        }
        const attrLists = block.attributeList || [];
        for (const list of attrLists) {
          if (list.$.keyName === 'advantages') {
            const vals = list.attributeVal || [];
            for (const val of vals) {
              levelAdvantages.push(val.$.N0);
            }
          }
        }
        levels.push({ level: levelNum, name: levelName, items: levelItems, advantages: levelAdvantages, spellcount: levelSpellcount });
      }
    }

    // Extract relationships
    for (const block of attrBlocks) {
      if (block.$.blockName === 'relationship') {
        const attrs = block.attribute || [];
        for (const attr of attrs) {
          for (const [group, value] of Object.entries(attr.$)) {
            relationships[group] = value;
          }
        }
      }
    }

    // Copy symbol and portrait images if present
    let characterSymbol = null;
    let characterPortrait = null;
    const symbolEntry = zip.getEntries().find(e => e.entryName.endsWith('_symbol.png'));
    if (symbolEntry) {
      const symbolPath = path.join('public', 'images', 'charsymbol', `${charName}_symbol.png`);
      fs.writeFileSync(symbolPath, symbolEntry.getData());
      characterSymbol = `/images/charsymbol/${charName}_symbol.png`;
    }
    const portraitEntry = zip.getEntries().find(e => e.entryName.endsWith('_picture.png'));
    if (portraitEntry) {
      const portraitPath = path.join('public', 'images', 'charportraits', `${charName}_picture.png`);
      fs.writeFileSync(portraitPath, portraitEntry.getData());
      characterPortrait = `/images/charportraits/${charName}_picture.png`;
    }

    // Insert or update character
    let character = await prisma.character.findUnique({ where: { name: charName } });
    if (!character) {
      character = await prisma.character.create({
        data: {
          slug,
          name: charName,
          description,
          iconFolder,
          characterChit,
          stage,
          vulnerability,
          startLocation,
          pronoun,
          facing,
          meaning,
          creator,
          artCredit,
          advantages: JSON.stringify(advantages),
          startingItems: JSON.stringify(startingItems),
          relationships: JSON.stringify(relationships),
          characterSymbol,
          characterPortrait,
          levels: JSON.stringify(levels),
          spellcount: totalSpellcount,
        },
      });
      charCount++;
      console.log(`Inserted character: ${charName}`);
    } else {
      character = await prisma.character.update({
        where: { name: charName },
        data: {
          slug,
          description,
          iconFolder,
          characterChit,
          stage,
          vulnerability,
          startLocation,
          pronoun,
          facing,
          meaning,
          creator,
          artCredit,
          advantages: JSON.stringify(advantages),
          startingItems: JSON.stringify(startingItems),
          relationships: JSON.stringify(relationships),
          characterSymbol,
          characterPortrait,
          levels: JSON.stringify(levels),
          spellcount: totalSpellcount,
        },
      });
      console.log(`Updated character: ${charName}`);
    }

    // Find all unique chits for this character
    const chits = new Set();
    for (const obj of gameObjects) {
      const attrBlocks = obj.AttributeBlock || [];
      for (const block of attrBlocks) {
        const attrs = block.attribute || [];
        for (const attr of attrs) {
          if (attr.$.character_chit !== undefined && attr.$.character_chit) {
            chits.add(attr.$.character_chit);
          }
        }
      }
    }
    for (const chitName of chits) {
      let chit = await prisma.chit.findUnique({ where: { name: chitName } });
      if (!chit) {
        chit = await prisma.chit.create({ data: { name: chitName } });
        chitCount++;
        console.log(`Inserted chit: ${chitName} (for ${charName})`);
      }
      // For now, just log the association
      console.log(`Character ${charName} has chit ${chitName}`);
    }
  }
  console.log(`Done. Inserted ${charCount} characters and ${chitCount} chits.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 