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
    clearing: thisAttrs[KEY.CLEARING] ?? null,
    facing: thisAttrs[KEY.FACING] ?? getThis(tile)[KEY.FACING] ?? null,
    isEnchanted: (getThis(tile)[KEY.FACING] || 'light') === 'dark',
  };
}

function classifyChit(obj) {
  const t = getThis(obj);
  if (t[KEY.WARNING]) return 'warning';
  if (t[KEY.SOUND]) return 'sound';
  if (t[KEY.TREASURE_LOCATION]) return 'treasure';
  if (t[KEY.DWELLING]) return 'dwelling';
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
  walkAncestors,
};
