/**
 * Build alternative chit manifest from coregamedata and copy alt art into
 * public/images/map/alternative/{monsters|natives|...}/ (same layout as classic).
 */

const fs = require('fs');
const path = require('path');

const IMAGE_EXT = /\.(gif|png|jpe?g)$/i;

function normalizeFolder(folder) {
  if (!folder) return '';
  return folder.replace(/_c$/, '').replace(/^images\//, '').replace(/^\//, '');
}

function walkJsonFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkJsonFiles(p, out);
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function resolveAltSourcePath(rsImages, altFolder, altType) {
  const folder = altFolder.replace(/^images\//, '').replace(/^\//, '');
  const base = path.join(rsImages, folder, altType);
  for (const ext of ['.png', '.gif', '.jpg', '.jpeg']) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * @returns {{ byKey: Record<string, { icon_type_alt: string, icon_folder: string }>, byName: Record<string, { icon_type_alt: string, icon_folder: string }>, entries: Array<{ icon_folder: string, icon_type?: string, icon_type_alt: string, icon_folder_alt: string, name: string }> }}
 */
function buildAlternativeManifest(coregamedataRoot) {
  const byKey = {};
  const byName = {};
  const entries = [];

  for (const filePath of walkJsonFiles(coregamedataRoot)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    const t = data.attributeBlocks?.this;
    if (!t?.icon_type_alt || !t?.icon_folder_alt) continue;

    const icon_folder = normalizeFolder(t.icon_folder || 'monsters');
    const icon_type = t.icon_type || null;
    const record = {
      icon_type_alt: t.icon_type_alt,
      icon_folder,
      icon_folder_alt: t.icon_folder_alt,
      name: data.name,
    };

    entries.push({
      ...record,
      icon_type,
      icon_folder_alt: t.icon_folder_alt,
    });

    byName[data.name] = record;
    if (icon_type) {
      byKey[`${icon_folder}:${icon_type}`] = record;
    }
  }

  return { byKey, byName, entries };
}

function syncAlternativeImages({ rsImages, outAlternativeDir, coregamedataRoot }) {
  const manifest = buildAlternativeManifest(coregamedataRoot);
  let copied = 0;
  let missing = 0;

  for (const entry of manifest.entries) {
    const src = resolveAltSourcePath(rsImages, entry.icon_folder_alt, entry.icon_type_alt);
    if (!src) {
      missing++;
      continue;
    }
    const ext = path.extname(src);
    const destDir = path.join(outAlternativeDir, entry.icon_folder);
    const dest = path.join(destDir, entry.icon_type_alt + ext);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }

  return { manifest, copied, missing };
}

/**
 * Natives exported from RealmSpeak often put Wesnoth paths in icon_folder directly.
 * Copy those (and icon_type_alt pairs) into alternative/natives|natives2/.
 */
function syncNativeAlternativeIcons({ rsImages, outAlternativeDir, nativesRoot }) {
  let copied = 0;
  let missing = 0;
  const seen = new Set();

  for (const filePath of walkJsonFiles(nativesRoot)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    const t = data.attributeBlocks?.this;
    if (!t?.icon_type) continue;

    const srcFolder = t.icon_folder_alt || (t.icon_folder?.startsWith('wesnoth') ? t.icon_folder : null);
    const srcType = t.icon_type_alt || t.icon_type;
    if (!srcFolder || !srcType) continue;

    let destFolder = 'natives';
    if (t.icon_folder && !t.icon_folder.startsWith('wesnoth')) {
      destFolder = normalizeFolder(t.icon_folder);
    }

    const destKey = `${destFolder}/${srcType}`;
    if (seen.has(destKey)) continue;

    const src = resolveAltSourcePath(rsImages, srcFolder, srcType);
    if (!src) {
      missing++;
      continue;
    }

    const ext = path.extname(src);
    const destDir = path.join(outAlternativeDir, destFolder);
    const dest = path.join(destDir, srcType + ext);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
    seen.add(destKey);
  }

  return { copied, missing };
}

function monsterDestFolder(t) {
  const f = normalizeFolder(t.icon_folder || 'monsters');
  if (f.startsWith('wesnoth')) return 'monsters';
  if (f === 'monsters' || f === 'monsters1' || f === 'monsters2') return f;
  return 'monsters';
}

/** Copy alternative monster/part art from coregamedata/monsters into map/alternative/{monsters*}/. */
function syncMonsterAlternativeIcons({ rsImages, outAlternativeDir, monstersRoot }) {
  let copied = 0;
  let missing = 0;
  const seen = new Set();

  for (const filePath of walkJsonFiles(monstersRoot)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }

    const records = [data, ...(data.parts || [])];
    for (const rec of records) {
      const t = rec.attributeBlocks?.this;
      if (!t?.icon_type) continue;

      const srcFolder = t.icon_folder_alt || (t.icon_folder?.startsWith('wesnoth') ? t.icon_folder : null);
      const srcType = t.icon_type_alt || t.icon_type;
      if (!srcFolder || !srcType) continue;

      const destFolder = monsterDestFolder(t);
      const destKey = `${destFolder}/${srcType}`;
      if (seen.has(destKey)) continue;

      const src = resolveAltSourcePath(rsImages, srcFolder, srcType);
      if (!src) {
        missing++;
        continue;
      }

      const ext = path.extname(src);
      const destDir = path.join(outAlternativeDir, destFolder);
      const dest = path.join(destDir, srcType + ext);
      fs.mkdirSync(destDir, { recursive: true });
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        copied++;
      }
      seen.add(destKey);
    }
  }

  return { copied, missing };
}

/** Copy armor/weapon/treasure chit art from RealmSpeak into map/alternative/{folder}/. */
function syncItemAlternativeIcons({ rsImages, outAlternativeDir, itemsRoot }) {
  let copied = 0;
  let missing = 0;
  const seen = new Set();

  for (const filePath of walkJsonFiles(itemsRoot)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    const t = data.attributeBlocks?.this;
    if (!t?.icon_type) continue;

    const destType = t.icon_type_alt || t.icon_type;
    let destFolder = normalizeFolder(t.icon_folder || 'treasure');
    if (destFolder.startsWith('wesnoth')) destFolder = 'steed';

    const destKey = `${destFolder}/${destType}`;
    if (seen.has(destKey)) continue;

    const srcCandidates = [];
    if (t.icon_folder_alt && t.icon_type_alt) {
      srcCandidates.push({ folder: t.icon_folder_alt, type: t.icon_type_alt });
    }
    if (t.icon_folder?.startsWith('wesnoth')) {
      srcCandidates.push({ folder: t.icon_folder, type: t.icon_type_alt || t.icon_type });
    }
    srcCandidates.push({ folder: destFolder, type: t.icon_type });
    if (t.icon_folder && !t.icon_folder.startsWith('wesnoth')) {
      srcCandidates.push({ folder: t.icon_folder, type: t.icon_type });
    }

    let src = null;
    for (const { folder, type } of srcCandidates) {
      src = resolveAltSourcePath(rsImages, folder, type);
      if (src) break;
    }

    if (!src) {
      missing++;
      continue;
    }

    const ext = path.extname(src);
    const destDir = path.join(outAlternativeDir, destFolder);
    const dest = path.join(destDir, destType + ext);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
    seen.add(destKey);
  }

  return { copied, missing };
}

function writeManifest(manifest, outPath) {
  const payload = {
    byKey: manifest.byKey,
    byName: manifest.byName,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  return outPath;
}

module.exports = {
  buildAlternativeManifest,
  resolveAltSourcePath,
  syncAlternativeImages,
  syncNativeAlternativeIcons,
  syncMonsterAlternativeIcons,
  syncItemAlternativeIcons,
  writeManifest,
  normalizeFolder,
};
