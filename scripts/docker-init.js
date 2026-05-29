#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PERSIST_DIRS = [
  '/app/public/parsed_sessions',
  '/app/public/stats',
  '/app/public/uploads',
  '/app/data',
];

// Templates are in /app/config-seed (not /app/data) because compose mounts
// realm-data/data over /app/data and would hide files baked into the image.
const SEED_DIR = '/app/config-seed';

const SEED_FILES = [
  {
    example: path.join(SEED_DIR, 'admin-users.example.json'),
    target: '/app/data/admin-users.json',
  },
  {
    example: path.join(SEED_DIR, 'realm-api-keys.example.json'),
    target: '/app/data/realm-api-keys.json',
  },
  {
    example: path.join(SEED_DIR, 'realm-session-registry.example.json'),
    target: '/app/data/realm-session-registry.json',
  },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function seedFile({ example, target }) {
  if (fs.existsSync(target)) {
    return;
  }
  if (!fs.existsSync(example)) {
    console.log(`Example file missing, skipping seed: ${example}`);
    return;
  }
  fs.copyFileSync(example, target);
  console.log(`Seeded config: ${target}`);
}

console.log('Initializing Hundred Acre Realm container...');

for (const dir of PERSIST_DIRS) {
  ensureDir(dir);
}

for (const seed of SEED_FILES) {
  seedFile(seed);
}

console.log('Container initialization complete.');
