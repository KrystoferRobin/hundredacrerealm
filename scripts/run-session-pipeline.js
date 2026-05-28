#!/usr/bin/env node
/**
 * Run the full display pipeline in a session directory (same steps as process_all_sessions).
 * Usage: node scripts/run-session-pipeline.js [sessionDir]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const sessionDir = path.resolve(process.argv[2] || process.cwd());

function resolveScript(name) {
  return path.join(ROOT, 'scripts', name);
}

function runNode(scriptName, args = '', cwd = sessionDir) {
  const cmd = `node "${resolveScript(scriptName)}" ${args}`.trim();
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function findFile(ext) {
  return fs.readdirSync(sessionDir).find((f) => f.endsWith(ext));
}

function exists(name) {
  return fs.existsSync(path.join(sessionDir, name));
}

if (!fs.existsSync(sessionDir)) {
  console.error('Session directory not found:', sessionDir);
  process.exit(1);
}

console.log('Session pipeline:', sessionDir);

const rslog = findFile('.rslog');
const rsgame = findFile('.rsgame');
const mainSrc = rslog || rsgame;

if (mainSrc) {
  runNode('parse_game_session.js', `"${mainSrc}"`);
}

if (rslog) {
  try {
    runNode('parse_game_log_detailed.js', `"${rslog}"`);
  } catch (e) {
    console.warn('⚠️  Detailed log parser failed:', e.message);
  }
} else {
  console.warn('⚠️  No .rslog — parsed_session.json will be missing (map-only upload)');
}

if (exists('extracted_game.xml')) {
  runNode('extract_realmspeak_save.js');
}

if (exists('extracted_game.xml')) {
  try {
    runNode('extract_character_stats.js');
  } catch (e) {
    console.warn('⚠️  Character stats failed:', e.message);
  }
}

if (exists('parsed_session.json') && exists('extracted_game.xml')) {
  try {
    runNode('extract_character_inventories.js');
  } catch (e) {
    console.warn('⚠️  Inventories failed:', e.message);
  }
}

if (exists('character_stats.json') && exists('scoring.json') && exists('character_inventories.json')) {
  try {
    runNode('calculate_scoring.js');
  } catch (e) {
    console.warn('⚠️  Scoring failed:', e.message);
  }
}

if (exists('parsed_session.json') && exists('map_locations.json') && exists('final_scores.json')) {
  try {
    runNode('generate_session_titles.js');
  } catch (e) {
    console.warn('⚠️  Session titles failed:', e.message);
  }
}

if (exists('parsed_session.json') && exists('extracted_game.xml')) {
  try {
    runNode('enhanced_character_parser.js');
  } catch (e) {
    console.warn('⚠️  Enhanced parser failed:', e.message);
  }
}

if (exists('parsed_session.json') && exists('map_locations.json')) {
  try {
    runNode('track_map_state.js');
  } catch (e) {
    console.warn('⚠️  Map state failed:', e.message);
  }
}

// Minimal listing helper for site when stats/session_titles lag
if (exists('parsed_session.json')) {
  const sessionData = JSON.parse(fs.readFileSync(path.join(sessionDir, 'parsed_session.json'), 'utf8'));
  const listing = {
    sessionTitle: sessionData.sessionTitle || sessionData.sessionName,
    sessionName: sessionData.sessionName,
    gameStatus: sessionData.gameStatus,
    totalDays: sessionData.days ? Object.keys(sessionData.days).length : 0,
    players: sessionData.players || {},
    characterToPlayer: sessionData.characterToPlayer || {},
    pipelineAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(sessionDir, 'session_listing.json'), JSON.stringify(listing, null, 2));
}

const required = ['map_data.json', 'map_locations.json'];
const missing = required.filter((f) => !exists(f));
if (missing.length) {
  console.error('Pipeline incomplete — missing:', missing.join(', '));
  process.exit(1);
}

if (!exists('parsed_session.json')) {
  console.error('Pipeline incomplete — missing parsed_session.json (need .rslog)');
  process.exit(1);
}

console.log('\n✓ Session pipeline complete');
