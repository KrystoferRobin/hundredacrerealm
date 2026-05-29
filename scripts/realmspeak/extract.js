const path = require('path');
const fs = require('fs');
const { buildAlternativeManifest } = require('../lib/chit-alternative-manifest');
const { BLOCK, KEY } = require('./constants');
const { parseGameXml, extractXmlFromRsgame } = require('./parseXml');
const {
  getBlock,
  getThis,
  isTile,
  isCharacter,
  getMapPlacement,
  classifyChit,
  isPlacedOnMapChit,
  isSetupCardHolder,
} = require('./objectGraph');

function toUiTile(tile) {
  return {
    position: tile.position,
    rotation: parseInt(tile.rotation, 10) || 0,
    tileType: tile.tile_type,
    tileName: tile.tile_type,
    image: tile.image,
    objectName: tile.name,
    isEnchanted: tile.isEnchanted,
  };
}

function toUiLocationEntry(entry) {
  const attrs = entry.attributes || {};
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    tile: entry.tileName,
    position: entry.position,
    rotation: entry.rotation,
    clearing: entry.clearing != null ? String(entry.clearing) : null,
    facing: entry.facing,
    ...(attrs.dwelling ? { dwelling: attrs.dwelling } : {}),
    ...(attrs.warning ? { warning: attrs.warning } : {}),
    ...(attrs.sound ? { sound: attrs.sound } : {}),
    ...(attrs.treasure_location ? { treasure_location: attrs.treasure_location } : {}),
    ...(attrs.monster ? { monster: attrs.monster } : {}),
    ...(attrs.native ? { native: attrs.native } : {}),
    ...(attrs.horse ? { horse: attrs.horse } : {}),
    ...(attrs.icon_type ? { icon_type: attrs.icon_type } : {}),
    ...(attrs.icon_folder ? { icon_folder: attrs.icon_folder } : {}),
    ...(attrs.icon_type_chit ? { icon_type_chit: attrs.icon_type_chit } : {}),
    ...(attrs.icon_folder_chit ? { icon_folder_chit: attrs.icon_folder_chit } : {}),
    ...(attrs.icon_type_alt ? { icon_type_alt: attrs.icon_type_alt } : {}),
    ...(attrs.icon_folder_alt ? { icon_folder_alt: attrs.icon_folder_alt } : {}),
  };
}

function extractMapData(game) {
  const { objects, objectsById } = game;
  const tiles = objects.filter(isTile);

  const mapTiles = tiles.map((tile) => {
    const thisAttrs = getThis(tile);
    const mapGrid = getBlock(tile, BLOCK.MAP_GRID).attrs;
    const facing = thisAttrs[KEY.FACING] || 'light';

    const chitsOnTile = tile.childIds
      .map((id) => objectsById[id])
      .filter(Boolean)
      .map((chit) => {
        const placement = getMapPlacement(chit, objectsById);
        return {
          id: chit.id,
          name: chit.name,
          type: classifyChit(chit),
          clearing: getThis(chit)[KEY.CLEARING] ?? null,
          facing: getThis(chit)[KEY.FACING] ?? null,
          attributes: getThis(chit),
        };
      });

    return {
      id: tile.id,
      name: tile.name,
      image: thisAttrs[KEY.IMAGE] || tile.name,
      tile_type: thisAttrs[KEY.TILE_TYPE] || null,
      position: mapGrid[KEY.MAP_POSITION] || null,
      rotation: mapGrid[KEY.MAP_ROTATION] || '0',
      facing,
      isEnchanted: facing === 'dark',
      chits: chitsOnTile,
    };
  });

  return {
    sessionName: game.meta?.name || null,
    tiles: mapTiles.map(toUiTile),
    tileCount: mapTiles.length,
    source: 'realmspeak-save',
    _tilesDetailed: mapTiles,
  };
}

/**
 * Map chits that are physically on the board (own clearing, or campfire-style dwelling).
 * Excludes setup-card pools (monster die, native boxes, unplaced treasure/items).
 */
function enrichLocationWithAlt(entry, altManifest) {
  if (entry.icon_type_alt) return entry;
  const folder = (entry.icon_folder || entry.icon_folder_chit || '').replace(/_c$/, '');
  const iconType = entry.icon_type_chit || entry.icon_type;
  const byKey = folder && iconType ? altManifest.byKey[`${folder}:${iconType}`] : null;
  const alt = byKey || altManifest.byName[entry.name];
  if (!alt) return entry;
  return {
    ...entry,
    icon_type_alt: alt.icon_type_alt,
    icon_folder: entry.icon_folder || alt.icon_folder,
  };
}

function extractMapLocations(game) {
  const { objects, objectsById } = game;
  const coregamedataRoot = path.join(__dirname, '../../coregamedata');
  const altManifest = fs.existsSync(coregamedataRoot)
    ? buildAlternativeManifest(coregamedataRoot)
    : { byKey: {}, byName: {} };
  const locations = {
    dwellings: [],
    sound: [],
    warning: [],
    treasure: [],
    monsters: [],
    natives: [],
    characters: [],
    other: [],
  };

  for (const obj of objects) {
    if (isTile(obj)) continue;
    if (!isPlacedOnMapChit(obj, objectsById)) continue;

    const type = classifyChit(obj);
    const placement = getMapPlacement(obj, objectsById);
    if (!placement || !placement.position) continue;

    const rawEntry = {
      id: obj.id,
      name: obj.name,
      type,
      tileId: placement.tileId,
      tileName: placement.tileName,
      tileImage: placement.tileImage,
      position: placement.position,
      rotation: placement.rotation,
      clearing: placement.clearing,
      facing: placement.facing,
      isEnchanted: placement.isEnchanted,
      attributes: getThis(obj),
    };
    const entry = enrichLocationWithAlt(toUiLocationEntry(rawEntry), altManifest);

    const bucket =
      type === 'dwelling'
        ? 'dwellings'
        : type === 'sound'
          ? 'sound'
          : type === 'warning'
            ? 'warning'
            : type === 'treasure'
              ? 'treasure'
              : type === 'monster'
                ? 'monsters'
                : type === 'native'
                  ? 'natives'
                  : type === 'player' || type === 'character'
                    ? 'characters'
                    : 'other';

    locations[bucket].push(entry);
  }

  locations.summary = {
    dwellings: locations.dwellings.length,
    sound: locations.sound.length,
    warning: locations.warning.length,
    treasure: locations.treasure.length,
    monsters: locations.monsters.length,
    natives: locations.natives.length,
    characters: locations.characters.length,
    other: locations.other.length,
  };

  return locations;
}

function extractCharacters(game) {
  const { objects, objectsById } = game;

  return objects
    .filter(isCharacter)
    .map((obj) => {
      const player = getBlock(obj, BLOCK.PLAYER).attrs;
      const victory = getBlock(obj, BLOCK.VICTORY).attrs;
      const placement = getMapPlacement(obj, objectsById);

      return {
        id: obj.id,
        name: obj.name,
        playerName: player[KEY.PLAYER_NAME] || obj.name,
        gold: player[KEY.GOLD] ?? null,
        notoriety: player[KEY.NOTORIETY] ?? null,
        fame: player[KEY.FAME] ?? null,
        startingGold: player[KEY.STARTING_GOLD] ?? null,
        victory,
        location: placement
          ? {
              tileId: placement.tileId,
              tileName: placement.tileName,
              clearing: placement.clearing,
              position: placement.position,
            }
          : null,
        attributes: { ...getThis(obj), ...player },
      };
    });
}

function extractGameMeta(game) {
  const { meta, objects, setups } = game;
  const gameWrapper = objects.find((o) => o.blocks[BLOCK.GAME]);
  const gameState = gameWrapper ? getBlock(gameWrapper, BLOCK.GAME).attrs : {};

  return {
    ...meta,
    gameState,
    day: gameState[KEY.GAME_DAY] ?? null,
    month: gameState[KEY.GAME_MONTH] ?? null,
    setupCount: setups.length,
    objectCount: objects.length,
  };
}

/**
 * Setup card denizen holders (ts_section, monster_die, box_num) per RealmSpeak SetupCardUtility.
 */
function extractSetupCard(game) {
  const { objects } = game;
  const holders = objects
    .filter(isSetupCardHolder)
    .map((obj) => {
      const t = getThis(obj);
      return {
        id: obj.id,
        name: obj.name,
        section: t[KEY.TS_SECTION] || null,
        monsterDie: t[KEY.MONSTER_DIE] ?? null,
        boxNum: t[KEY.BOX_NUM] ?? null,
        summon: t[KEY.SUMMON] ?? null,
        setupStart: t[KEY.SETUP_START] ?? null,
        heldCount: obj.childIds.length,
        heldIds: obj.childIds,
        attributes: t,
      };
    });

  const bySection = {};
  for (const h of holders) {
    const key = h.section || '_unsectioned';
    if (!bySection[key]) bySection[key] = [];
    bySection[key].push(h);
  }

  return {
    holders,
    bySection,
    holderCount: holders.length,
  };
}

function extractAllFromGame(game) {
  return {
    meta: extractGameMeta(game),
    mapData: extractMapData(game),
    mapLocations: extractMapLocations(game),
    characters: extractCharacters(game),
    setupCard: extractSetupCard(game),
    setups: game.setups,
  };
}

function loadGameFromRsgame(rsgamePath, outputDir = null) {
  if (outputDir) {
    const xmlPath = extractXmlFromRsgame(rsgamePath, outputDir);
    return parseGameXml(xmlPath);
  }
  const xml = extractXmlFromRsgame(rsgamePath);
  return parseGameXml(xml);
}

function extractFromRsgame(rsgamePath, outputDir = null) {
  const game = loadGameFromRsgame(rsgamePath, outputDir);
  return extractAllFromGame(game);
}

function extractFromXml(xmlPath) {
  const game = parseGameXml(xmlPath);
  return extractAllFromGame(game);
}

function writeSessionOutputs(sessionDir, extracted) {
  fs.mkdirSync(sessionDir, { recursive: true });

  const mapDataForFile = { ...extracted.mapData };
  delete mapDataForFile._tilesDetailed;

  fs.writeFileSync(
    path.join(sessionDir, 'map_data.json'),
    JSON.stringify(mapDataForFile, null, 2)
  );
  fs.writeFileSync(
    path.join(sessionDir, 'map_locations.json'),
    JSON.stringify(extracted.mapLocations, null, 2)
  );
  fs.writeFileSync(
    path.join(sessionDir, 'game_state.json'),
    JSON.stringify(
      {
        meta: extracted.meta,
        characters: extracted.characters,
        setupCard: extracted.setupCard,
        setups: extracted.setups,
      },
      null,
      2
    )
  );
}

module.exports = {
  extractMapData,
  extractMapLocations,
  extractCharacters,
  extractGameMeta,
  extractSetupCard,
  extractAllFromGame,
  extractFromRsgame,
  extractFromXml,
  loadGameFromRsgame,
  writeSessionOutputs,
};
