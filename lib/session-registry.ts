import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ResolvedRealmIdentity } from './realm-identity';

export const REGISTRY_FILE = path.join(process.cwd(), 'data', 'realm-session-registry.json');

export interface SessionRegistryEntry {
  sessionId: string;
  realmKey: string;
  realmKeySource: string;
  gameTitle?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  lastUploadedBy?: string;
  status: 'active' | 'archived';
}

export function loadRegistry(): SessionRegistryEntry[] {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const raw = fs.readFileSync(REGISTRY_FILE, 'utf8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error loading session registry:', error);
  }
  return [];
}

export function saveRegistry(entries: SessionRegistryEntry[]): boolean {
  try {
    const dir = path.dirname(REGISTRY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(entries, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving session registry:', error);
    return false;
  }
}

export function findByRealmKey(realmKey: string): SessionRegistryEntry | undefined {
  return loadRegistry().find((e) => e.realmKey === realmKey && e.status === 'active');
}

export function findBySessionId(sessionId: string): SessionRegistryEntry | undefined {
  return loadRegistry().find((e) => e.sessionId === sessionId && e.status === 'active');
}

export function allocateSession(
  identity: ResolvedRealmIdentity,
  gameTitle?: string,
  uploadedBy?: string
): { entry: SessionRegistryEntry; isNew: boolean } {
  const registry = loadRegistry();
  const existing = registry.find((e) => e.realmKey === identity.realmKey && e.status === 'active');

  if (existing) {
    existing.updatedAt = new Date().toISOString();
    if (gameTitle) existing.gameTitle = gameTitle;
    if (uploadedBy) existing.lastUploadedBy = uploadedBy;
    saveRegistry(registry);
    return { entry: existing, isNew: false };
  }

  const now = new Date().toISOString();
  const entry: SessionRegistryEntry = {
    sessionId: crypto.randomUUID(),
    realmKey: identity.realmKey,
    realmKeySource: identity.realmKeySource,
    gameTitle,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    lastUploadedBy: uploadedBy,
    status: 'active',
  };
  registry.push(entry);
  saveRegistry(registry);
  return { entry, isNew: true };
}

export function bumpRevision(sessionId: string): SessionRegistryEntry | null {
  const registry = loadRegistry();
  const entry = registry.find((e) => e.sessionId === sessionId && e.status === 'active');
  if (!entry) return null;
  entry.revision += 1;
  entry.updatedAt = new Date().toISOString();
  saveRegistry(registry);
  return entry;
}
