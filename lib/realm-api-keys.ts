import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const API_KEYS_FILE = path.join(process.cwd(), 'data', 'realm-api-keys.json');

export interface RealmApiKeyRecord {
  id: string;
  label: string;
  keyHash: string;
  prefix: string;
  createdAt: string;
  createdBy?: string;
  enabled: boolean;
}

export function hashApiKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

export function generateApiKey(): { plain: string; prefix: string } {
  const plain = `har_${crypto.randomBytes(24).toString('base64url')}`;
  return { plain, prefix: plain.slice(0, 12) };
}

export function loadApiKeys(): RealmApiKeyRecord[] {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const raw = fs.readFileSync(API_KEYS_FILE, 'utf8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error loading realm API keys:', error);
  }
  return [];
}

export function saveApiKeys(keys: RealmApiKeyRecord[]): boolean {
  try {
    const dir = path.dirname(API_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving realm API keys:', error);
    return false;
  }
}

export function validateApiKey(authorizationHeader: string | null): RealmApiKeyRecord | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const plain = authorizationHeader.slice(7).trim();
  if (!plain) return null;
  const hash = hashApiKey(plain);
  return loadApiKeys().find((k) => k.enabled && k.keyHash === hash) ?? null;
}

export function createApiKey(label: string, createdBy?: string): { record: RealmApiKeyRecord; plainKey: string } {
  const { plain, prefix } = generateApiKey();
  const record: RealmApiKeyRecord = {
    id: crypto.randomUUID(),
    label,
    keyHash: hashApiKey(plain),
    prefix,
    createdAt: new Date().toISOString(),
    createdBy,
    enabled: true,
  };
  const keys = loadApiKeys();
  keys.push(record);
  saveApiKeys(keys);
  return { record, plainKey: plain };
}
