const { BLOCK, KEY } = require('./constants');

function getBlock(obj, blockName = BLOCK.THIS) {
  return obj.blocks[blockName] || { attrs: {}, lists: {} };
}

function getThis(obj) {
  return getBlock(obj, BLOCK.THIS).attrs;
}

function hasThisKey(obj, key) {
  return key in getThis(obj);
}

function getAttr(obj, blockName, key) {
  const block = getBlock(obj, blockName);
  return block.attrs[key];
}

function isTile(obj) {
  return hasThisKey(obj, KEY.TILE);
}

function isCharacter(obj) {
  return Boolean(obj.blocks[BLOCK.PLAYER]);
}

function isOnMap(obj) {
  let current = obj;
  while (current) {
    if (isTile(current)) return true;
    if (!current.parentId) return false;
    current = null; // caller passes objectsById
  }
  return false;
}

function walkAncestors(obj, objectsById) {
  const chain = [];
  let current = obj;
  while (current) {
    chain.push(current);
    current = current.parentId ? objectsById[current.parentId] : null;
  }
  return chain;
}

function findMapTile(obj, objectsById) {
  for (const ancestor of walkAncestors(obj, objectsById)) {
    if (isTile(ancestor)) return ancestor;
  }
  return null;
}

function hasOwnClearing(obj) {
  const c = getThis(obj)[KEY.CLEARING];
  return c != null && c !== '';
}

/** Clearing on this chit only (not inherited from dwelling / native group). */
function getOwnClearing(obj) {
  if (!hasOwnClearing(obj)) return null;
  return String(getThis(obj)[KEY.CLEARING]);
}

/** Warning/sound counter placed on tile during setup (e.g. Bones V), not in a clearing. */
function isTileLevelSetupChit(obj, objectsById) {
  const t = getThis(obj);
  if (!t.chit) return false;
  const parent = obj.parentId ? objectsById[obj.parentId] : null;
  return parent != null && isTile(parent);
}

function isDwellingOnMap(obj, objectsById) {
  if (!hasThisKey(obj, KEY.DWELLING)) return false;
  if (!findMapTile(obj, objectsById)) return false;
  if (hasOwnClearing(obj)) return true;
  const parent = obj.parentId ? objectsById[obj.parentId] : null;
  if (!parent) return false;
  const pt = getThis(parent);
  if (pt[KEY.WARNING] || pt[KEY.SOUND]) {
    return findMapTile(parent, objectsById) != null;
  }
  return false;
}

/**
 * True when the chit is physically on the map (clearing or campfire-style dwelling),
 * not in a setup-card pool (monster die, native box, unplaced treasure, etc.).
 */
function isPlacedOnMapChit(obj, objectsById) {
  const tile = findMapTile(obj, objectsById);
  if (!tile) return false;

  const type = classifyChit(obj);
  const t = getThis(obj);

  if (t.part) return false;

  if (type === 'dwelling') {
    return isDwellingOnMap(obj, objectsById);
  }

  if (type === 'warning') {
    return isTileLevelSetupChit(obj, objectsById) || hasOwnClearing(obj);
  }

  if (type === 'sound') {
    return hasOwnClearing(obj);
  }

  if (type === 'monster' || type === 'native' || type === 'character' || type === 'player') {
    return hasOwnClearing(obj);
  }

  if (type === 'treasure') {
    return Boolean(t[KEY.TREASURE_LOCATION]) && hasOwnClearing(obj);
  }

  if (type === 'other') {
    return hasOwnClearing(obj);
  }

  return false;
}

function getMapPlacement(obj, objectsById) {
  const tile = findMapTile(obj, objectsById);
  if (!tile) return null;

  const mapGrid = getBlock(tile, BLOCK.MAP_GRID).attrs;
  const thisAttrs = getThis(obj);
  const tileAttrs = getThis(tile);

  return {
    tileId: tile.id,
    tileName: tile.name,
    tileImage: tileAttrs[KEY.IMAGE] || tile.name,
    tileType: tileAttrs[KEY.TILE_TYPE] || null,
    position: mapGrid[KEY.MAP_POSITION] || null,
    rotation: mapGrid[KEY.MAP_ROTATION] || '0',
    clearing: getOwnClearing(obj),
    facing: thisAttrs[KEY.FACING] ?? getThis(tile)[KEY.FACING] ?? null,
    isEnchanted: (getThis(tile)[KEY.FACING] || 'light') === 'dark',
  };
}

function classifyChit(obj) {
  const t = getThis(obj);
  // Dwelling chits also carry a warning type (smoke/stink); prefer dwelling.
  if (t[KEY.DWELLING]) return 'dwelling';
  if (t[KEY.WARNING]) return 'warning';
  if (t[KEY.SOUND]) return 'sound';
  if (t[KEY.TREASURE_LOCATION]) return 'treasure';
  if (t[KEY.MONSTER]) return 'monster';
  if (t[KEY.NATIVE]) return 'native';
  if (t[KEY.CHARACTER]) return 'character';
  if (obj.blocks[BLOCK.PLAYER]) return 'player';
  return 'other';
}

function isSetupCardHolder(obj) {
  const t = getThis(obj);
  return Boolean(t[KEY.TS_SECTION] || t[KEY.MONSTER_DIE] || t[KEY.BOX_NUM]);
}

module.exports = {
  getBlock,
  getThis,
  hasThisKey,
  getAttr,
  isTile,
  isCharacter,
  findMapTile,
  getMapPlacement,
  classifyChit,
  isSetupCardHolder,
  isPlacedOnMapChit,
  isDwellingOnMap,
  isTileLevelSetupChit,
  hasOwnClearing,
  getOwnClearing,
  walkAncestors,
};
