#!/usr/bin/env node
/**
 * Copy RealmSpeak map graphics into public/images.
 *
 * Tiles: public/images/tiles/{classic|legendary|legendary-icons}/
 * Chits: public/images/map/{classic|color}/<folder>/
 * Alt:   public/images/map/alternative/<folder>/ (same folders as classic; from coregamedata)
 * Chars: public/images/characters/{classic|legendary|legendary-classic}/
 *
 * Usage: node scripts/sync-realmspeak-map-images.js [--migrate-tiles]
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const RS_IMAGES = path.join(
  REPO_ROOT,
  'RealmSpeak-src/magic_realm/utility/components/resources/images'
);
const OUT_MAP = path.join(REPO_ROOT, 'public/images/map');
const OUT_TILES = path.join(REPO_ROOT, 'public/images/tiles');
const OUT_CHARS = path.join(REPO_ROOT, 'public/images/characters');

const TILE_SYNCS = [
  { src: 'tiles', dest: 'classic' },
  { src: 'tiles_legendary', dest: 'legendary' },
  { src: 'tiles_legendary_icons', dest: 'legendary-icons' },
];

const CHIT_SYNCS = [
  { src: 'dwellings', set: 'classic', dest: 'dwellings' },
  { src: 'dwellings_c', set: 'color', dest: 'dwellings' },
  { src: 'natives', set: 'classic', dest: 'natives' },
  { src: 'natives_c', set: 'color', dest: 'natives' },
  { src: 'natives2', set: 'classic', dest: 'natives2' },
  { src: 'natives2_c', set: 'color', dest: 'natives2' },
  { src: 'monsters', set: 'classic', dest: 'monsters' },
  { src: 'monsters_c', set: 'color', dest: 'monsters' },
  { src: 'monsters1', set: 'classic', dest: 'monsters1' },
  { src: 'monsters1_c', set: 'color', dest: 'monsters1' },
  { src: 'monsters2', set: 'classic', dest: 'monsters2' },
  { src: 'monsters2_c', set: 'color', dest: 'monsters2' },
  { src: 'steed', set: 'classic', dest: 'steed' },
  { src: 'steed_c', set: 'color', dest: 'steed' },
  { src: 'armor', set: 'classic', dest: 'armor' },
  { src: 'armor_c', set: 'color', dest: 'armor' },
  { src: 'weapons', set: 'classic', dest: 'weapons' },
  { src: 'weapons_c', set: 'color', dest: 'weapons' },
];

const CHARACTER_SYNCS = [
  { src: 'characters', dest: 'classic' },
  { src: 'characters_legendary', dest: 'legendary' },
  { src: 'characters_legendary_classic', dest: 'legendary-classic' },
];

function copyDirFlat(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`  skip (missing): ${srcDir}`);
    return 0;
  }
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const name of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, name);
    const stat = fs.statSync(srcPath);
    if (!stat.isFile()) continue;
    if (!/\.(gif|png|jpe?g)$/i.test(name)) continue;
    fs.copyFileSync(srcPath, path.join(destDir, name));
    count++;
  }
  return count;
}

function removeDirIfExists(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function migrateLegacyTiles() {
  const legacy = path.join(REPO_ROOT, 'public/images/tiles');
  const classic = path.join(OUT_TILES, 'classic');
  if (!fs.existsSync(legacy)) return;
  const entries = fs.readdirSync(legacy);
  const hasRootGifs = entries.some(
    (e) => /\.gif$/i.test(e) && fs.statSync(path.join(legacy, e)).isFile()
  );
  if (!hasRootGifs) return;
  fs.mkdirSync(classic, { recursive: true });
  for (const name of entries) {
    const p = path.join(legacy, name);
    if (!fs.statSync(p).isFile() || !/\.gif$/i.test(name)) continue;
    const dest = path.join(classic, name);
    if (!fs.existsSync(dest)) fs.renameSync(p, dest);
  }
  console.log('Migrated flat public/images/tiles/*.gif → tiles/classic/');
}

function migrateLegacyMapModern() {
  const legacyModern = path.join(OUT_MAP, 'modern');
  const color = path.join(OUT_MAP, 'color');
  if (!fs.existsSync(legacyModern)) return;
  for (const folder of fs.readdirSync(legacyModern)) {
    const src = path.join(legacyModern, folder);
    if (!fs.statSync(src).isDirectory()) continue;
    const dest = path.join(color, folder);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
      console.log(`Migrated map/modern/${folder} → map/color/${folder}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(RS_IMAGES)) {
    console.error(`RealmSpeak images not found at:\n  ${RS_IMAGES}`);
    process.exit(1);
  }

  if (process.argv.includes('--migrate-tiles')) migrateLegacyTiles();
  migrateLegacyMapModern();

  let total = 0;

  for (const { src, dest } of TILE_SYNCS) {
    const n = copyDirFlat(path.join(RS_IMAGES, src), path.join(OUT_TILES, dest));
    console.log(`tiles/${dest}: ${n} files ← ${src}`);
    total += n;
  }

  for (const { src, set, dest } of CHIT_SYNCS) {
    const n = copyDirFlat(path.join(RS_IMAGES, src), path.join(OUT_MAP, set, dest));
    console.log(`map/${set}/${dest}: ${n} files ← ${src}`);
    total += n;
  }

  for (const { src, dest } of CHARACTER_SYNCS) {
    const n = copyDirFlat(path.join(RS_IMAGES, src), path.join(OUT_CHARS, dest));
    console.log(`characters/${dest}: ${n} files ← ${src}`);
    total += n;
  }

  const {
    syncAlternativeImages,
    syncNativeAlternativeIcons,
    syncMonsterAlternativeIcons,
    syncItemAlternativeIcons,
    writeManifest,
  } = require('./lib/chit-alternative-manifest');
  const coregamedataRoot = path.join(REPO_ROOT, 'coregamedata');
  const altOut = path.join(OUT_MAP, 'alternative');
  removeDirIfExists(path.join(altOut, 'wesnoth'));
  const { manifest, copied, missing } = syncAlternativeImages({
    rsImages: RS_IMAGES,
    outAlternativeDir: altOut,
    coregamedataRoot,
  });
  const manifestPath = path.join(REPO_ROOT, 'public/data/chit-alternative-manifest.json');
  writeManifest(manifest, manifestPath);
  console.log(
    `map/alternative/*: ${copied} alt icons ← coregamedata (${missing} missing sources)`
  );
  console.log(`manifest: ${path.relative(REPO_ROOT, manifestPath)}`);
  total += copied;

  const nativesRoot = path.join(coregamedataRoot, 'natives');
  const { copied: nCopied, missing: nMissing } = syncNativeAlternativeIcons({
    rsImages: RS_IMAGES,
    outAlternativeDir: altOut,
    nativesRoot,
  });
  console.log(
    `map/alternative/natives*: +${nCopied} native icons from Wesnoth paths (${nMissing} missing)`
  );
  total += nCopied;

  const monstersRoot = path.join(coregamedataRoot, 'monsters');
  const { copied: mCopied, missing: mMissing } = syncMonsterAlternativeIcons({
    rsImages: RS_IMAGES,
    outAlternativeDir: altOut,
    monstersRoot,
  });
  console.log(
    `map/alternative/monsters*: +${mCopied} monster icons from Wesnoth paths (${mMissing} missing)`
  );
  total += mCopied;

  const itemsRoot = path.join(coregamedataRoot, 'items');
  const { copied: iCopied, missing: iMissing } = syncItemAlternativeIcons({
    rsImages: RS_IMAGES,
    outAlternativeDir: altOut,
    itemsRoot,
  });
  console.log(
    `map/alternative/{armor,weapons,...}: +${iCopied} item icons (${iMissing} missing)`
  );
  total += iCopied;

  console.log(`\nDone. ${total} asset files synced.`);
  console.log('Tiles:  /images/tiles/{classic|legendary|legendary-icons}/');
  console.log('Chits:  /images/map/{classic|color}/<folder>/');
  console.log('Alt:    /images/map/alternative/<folder>/  (parallel to classic)');
  console.log('Chars:  /images/characters/{classic|legendary|legendary-classic}/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
