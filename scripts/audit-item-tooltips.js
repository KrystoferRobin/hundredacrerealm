#!/usr/bin/env node
/**
 * Report items whose tooltip would render with no visible content.
 * Run: node scripts/audit-item-tooltips.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'coregamedata', 'items');

function walkJsonFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkJsonFiles(p, out);
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function isSpellPart(t) {
  if (!t) return false;
  if (t.spell !== undefined && t.spell !== '') return true;
  return Boolean(t.duration && t.target && t.part === undefined && t.monster === undefined);
}

function isMonsterPart(t, blocks) {
  if (!t || isSpellPart(t)) return false;
  if (t.part !== undefined) return true;
  if (t.monster !== undefined) return true;
  return Boolean(blocks.light && blocks.dark);
}

function wouldShowContent(record) {
  const t = record.attributeBlocks?.this || {};
  const parts = record.parts || [];

  if (t.spell) return true;
  if (record.attributeBlocks.intact && record.attributeBlocks.damaged) return true;
  if (record.attributeBlocks.unalerted && record.attributeBlocks.alerted) return true;
  if (t.horse && record.attributeBlocks.trot) return true;
  if (t.base_price || t.fame || t.notoriety || t.vulnerability || t.weight) return true;
  if ((t.text || '').trim()) return true;
  if (parts.some((p) => isSpellPart(p.attributeBlocks?.this) || isMonsterPart(p.attributeBlocks?.this, p.attributeBlocks))) {
    return true;
  }
  return false;
}

const byName = new Map();
for (const filePath of walkJsonFiles(ROOT)) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const list = byName.get(data.name) || [];
  list.push({ filePath, data });
  byName.set(data.name, list);
}

const empty = [];
const dupes = [];

for (const [name, records] of byName) {
  if (records.length > 1) dupes.push({ name, count: records.length });

  const best = records
    .map((r) => r.data)
    .sort((a, b) => {
      const ap = (a.parts || []).length;
      const bp = (b.parts || []).length;
      if (bp !== ap) return bp - ap;
      return Number(a.id) - Number(b.id);
    })[0];

  if (!wouldShowContent(best)) {
    empty.push({ name, file: path.relative(path.join(__dirname, '..'), records[0].filePath) });
  }
}

console.log(`Items with duplicate names: ${dupes.length}`);
console.log(`Items with no tooltip content: ${empty.length}`);
if (empty.length) {
  empty.forEach((e) => console.log(`  - ${e.name} (${e.file})`));
} else {
  console.log('  (none)');
}
