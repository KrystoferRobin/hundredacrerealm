#!/usr/bin/env npx tsx
/**
 * Verify map/tile/character graphics URLs resolve to files on disk.
 * Run: npx tsx scripts/verify-map-graphics.ts
 */

import fs from 'fs';
import path from 'path';
import { getChitImageCandidates, type MapChitLocation } from '../lib/map-assets';
import { getTileImageUrl } from '../lib/tile-image';
import { getCharacterMapIconCandidates } from '../lib/character-map-icon';
import type { CounterGraphicsStyle, TileGraphicsStyle } from '../lib/map-graphics-styles';
import altManifest from '../public/data/chit-alternative-manifest.json';

const REPO = path.join(__dirname, '..');
const PUBLIC = path.join(REPO, 'public');

const COUNTER_STYLES: CounterGraphicsStyle[] = [
  'classic',
  'legendary-classic',
  'legendary',
  'alternative',
];

const TILE_STYLES: TileGraphicsStyle[] = ['classic', 'legendary', 'legendary-icons'];

function urlToFile(url: string): string {
  return path.join(PUBLIC, url.replace(/^\//, ''));
}

function firstExisting(candidates: string[]): string | null {
  for (const url of candidates) {
    if (fs.existsSync(urlToFile(url))) return url;
  }
  return null;
}

function collectMapChits(mapLocations: Record<string, unknown>): MapChitLocation[] {
  const items: MapChitLocation[] = [];
  for (const [bucket, list] of Object.entries(mapLocations)) {
    if (bucket === 'summary' || !Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry && typeof entry === 'object' && entry.type) {
        items.push(entry as MapChitLocation);
      }
    }
  }
  return items;
}

type Miss = { label: string; style: string; tried: string[] };

function verifyChits(chits: MapChitLocation[]): Miss[] {
  const misses: Miss[] = [];
  const iconChits = chits.filter((c) => c.type !== 'sound' && c.type !== 'warning');

  for (const style of COUNTER_STYLES) {
    for (const chit of iconChits) {
      const candidates = getChitImageCandidates(chit, style);
      if (candidates.length === 0) continue;
      const hit = firstExisting(candidates);
      if (!hit) {
        misses.push({
          label: `chit:${chit.type}:${chit.name} (${chit.icon_folder || '?'}/${chit.icon_type || '?'})`,
          style,
          tried: candidates.slice(0, 6),
        });
      }
    }
  }
  return misses;
}

function verifyManifest(): Miss[] {
  const misses: Miss[] = [];
  const manifest = altManifest as {
    byKey: Record<string, { icon_type_alt: string; icon_folder: string }>;
    byName: Record<string, { icon_type_alt: string; icon_folder: string }>;
  };

  const checked = new Set<string>();

  for (const [name, rec] of Object.entries(manifest.byName)) {
    const fake: MapChitLocation = {
      id: name,
      name,
      type: 'monster',
      tile: '',
      clearing: null,
      icon_folder: rec.icon_folder,
      icon_type: name,
      icon_type_alt: rec.icon_type_alt,
    };
    const candidates = getChitImageCandidates(fake, 'alternative');
    const hit = firstExisting(candidates);
    const key = `${rec.icon_folder}:${rec.icon_type_alt}`;
    if (!hit && !checked.has(key)) {
      checked.add(key);
      misses.push({
        label: `manifest:name:${name} → ${rec.icon_folder}/${rec.icon_type_alt}`,
        style: 'alternative',
        tried: candidates.slice(0, 4),
      });
    }
  }

  for (const [key, rec] of Object.entries(manifest.byKey)) {
    const fake: MapChitLocation = {
      id: key,
      name: key,
      type: 'monster',
      tile: '',
      clearing: null,
      icon_folder: rec.icon_folder,
      icon_type: key.split(':')[1] || rec.icon_type_alt,
      icon_type_alt: rec.icon_type_alt,
    };
    const candidates = getChitImageCandidates(fake, 'alternative');
    const hit = firstExisting(candidates);
    if (!hit) {
      misses.push({
        label: `manifest:${key} → ${rec.icon_folder}/${rec.icon_type_alt}`,
        style: 'alternative',
        tried: candidates.slice(0, 4),
      });
    }
  }
  return misses;
}

function verifyTiles(tiles: Array<{ objectName: string; image?: string; isEnchanted?: boolean }>): Miss[] {
  const misses: Miss[] = [];
  for (const style of TILE_STYLES) {
    for (const tile of tiles) {
      const url = getTileImageUrl(tile, undefined, style);
      if (!fs.existsSync(urlToFile(url))) {
        misses.push({ label: `tile:${tile.objectName}`, style, tried: [url] });
      }
    }
  }
  return misses;
}

function verifyCharacters(names: string[]): Miss[] {
  const misses: Miss[] = [];
  for (const style of COUNTER_STYLES) {
    for (const name of names) {
      const candidates = getCharacterMapIconCandidates(name, style);
      const hit = firstExisting(candidates);
      if (!hit) {
        misses.push({ label: `character:${name}`, style, tried: candidates });
      }
    }
  }
  return misses;
}

function main() {
  const sessionDir = path.join(
    REPO,
    'public/parsed_sessions/01a20e7f-7b8d-4773-8aa8-4e9e36189d4a'
  );
  const mapLocPath = path.join(sessionDir, 'map_locations.json');
  const mapDataPath = path.join(sessionDir, 'map_data.json');

  if (!fs.existsSync(mapLocPath)) {
    console.error('No map_locations.json — run parse on test session first.');
    process.exit(1);
  }

  const mapLocations = JSON.parse(fs.readFileSync(mapLocPath, 'utf8'));
  const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
  const chits = collectMapChits(mapLocations);

  const characterNames = [
    'Amazon',
    'Berserker',
    'Captain',
    'Druid',
    'Elf',
    'White Knight',
    'Woods Girl',
  ];

  const manifestMisses = verifyManifest();
  const chitMisses = verifyChits(chits);
  const tileMisses = verifyTiles(mapData.tiles || []);
  const charMisses = verifyCharacters(characterNames);

  const all = [...manifestMisses, ...chitMisses, ...tileMisses, ...charMisses];

  const summary = {
    mapChits: chits.length,
    iconChits: chits.filter((c) => c.type !== 'sound' && c.type !== 'warning').length,
    tiles: (mapData.tiles || []).length,
    manifestEntries: Object.keys((altManifest as { byKey: Record<string, unknown> }).byKey).length,
    misses: all.length,
  };

  console.log('Map graphics verification\n');
  console.log(JSON.stringify(summary, null, 2));

  if (all.length > 0) {
    console.log('\n--- Misses (no file for any candidate) ---\n');
    const byStyle: Record<string, Miss[]> = {};
    for (const m of all) {
      (byStyle[m.style] ??= []).push(m);
    }
    for (const [style, list] of Object.entries(byStyle)) {
      console.log(`\n[${style}] ${list.length}`);
      for (const m of list.slice(0, 25)) {
        console.log(`  ${m.label}`);
        console.log(`    tried: ${m.tried.join(', ')}`);
      }
      if (list.length > 25) console.log(`  … and ${list.length - 25} more`);
    }
    process.exit(1);
  }

  console.log('\n✓ All variants resolve to existing files.');
}

main();
