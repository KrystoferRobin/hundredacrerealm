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
  writeManifest,
  normalizeFolder,
};
