/**
 * Attribute block and key names aligned with RealmSpeak Java sources.
 * @see RealmSpeak-src/magic_realm/utility/map/Tile.java
 * @see RealmSpeak-src/magic_realm/utility/components/wrapper/CharacterWrapper.java
 * @see RealmSpeak-src/magic_realm/utility/components/ChitComponent.java
 */

const BLOCK = {
  THIS: 'this',
  MAP_GRID: 'mapGrid',
  PLAYER: 'RS_PB__',
  VICTORY: 'VR__',
  GAME: '_gb__',
};

const KEY = {
  TILE: 'tile',
  TILE_TYPE: 'tile_type',
  IMAGE: 'image',
  FACING: 'facing',
  MAP_POSITION: 'mapposition',
  MAP_ROTATION: 'maprotation',
  CLEARING: 'clearing',
  WARNING: 'warning',
  SOUND: 'sound',
  TREASURE_LOCATION: 'treasure_location',
  DWELLING: 'dwelling',
  MONSTER: 'monster',
  NATIVE: 'native',
  CHARACTER: 'character',
  TS_SECTION: 'ts_section',
  MONSTER_DIE: 'monster_die',
  BOX_NUM: 'box_num',
  SUMMON: 'summon',
  SETUP_START: 'setup_start',
  PLAYER_NAME: 'plnm__',
  GOLD: 'gol__',
  NOTORIETY: 'not__',
  FAME: 'fam__',
  GAME_STATE: '_gs__',
  GAME_DAY: 'c_day',
  GAME_MONTH: 'c_mnth',
  STARTING_GOLD: 'stgold__',
};

const FACING = {
  LIGHT: 'light',
  DARK: 'dark',
};

const ZIP_INTERNAL_XML = 'GameData_CHEATER_.xml';

module.exports = { BLOCK, KEY, FACING, ZIP_INTERNAL_XML };
