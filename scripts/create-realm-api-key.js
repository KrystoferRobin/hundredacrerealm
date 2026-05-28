#!/usr/bin/env node
/**
 * Create a Realm Export API key (same storage as admin UI).
 * Usage: node scripts/create-realm-api-key.js [label]
 */
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const KEYS_FILE = path.join(process.cwd(), 'data', 'realm-api-keys.json');

function hash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function load() {
  if (!fs.existsSync(KEYS_FILE)) return [];
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8').replace(/^\uFEFF/, ''));
}

function save(keys) {
  fs.mkdirSync(path.dirname(KEYS_FILE), { recursive: true });
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

const label = process.argv[2] || 'export-tool';
const plain = `har_${crypto.randomBytes(24).toString('base64url')}`;
const record = {
  id: crypto.randomUUID(),
  label,
  keyHash: hash(plain),
  prefix: plain.slice(0, 12),
  createdAt: new Date().toISOString(),
  enabled: true,
};

const keys = load();
keys.push(record);
save(keys);

console.log('API key created (copy now — not shown again):');
console.log(plain);
console.log('\nLabel:', label);
console.log('Prefix:', record.prefix);
