import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const BUNDLE_MANIFEST = 'manifest.json';
export const SUPPORTED_SCHEMA_VERSION = 1;

export interface RealmBundleManifest {
  schemaVersion: number;
  sessionId: string;
  realmKey: string;
  realmKeySource?: string;
  revision?: number;
  profile?: 'public' | 'admin';
  exportedAt?: string;
  exporter?: string;
  gameTitle?: string;
  files?: string[];
}

export function getSessionsDir(): string {
  return path.join(process.cwd(), 'public', 'parsed_sessions');
}

export function getSessionDir(sessionId: string): string {
  return path.join(getSessionsDir(), sessionId);
}

export function extractBundleToSession(zipBuffer: Buffer, expectedSessionId: string): {
  manifest: RealmBundleManifest;
  sessionDir: string;
} {
  const zip = new AdmZip(zipBuffer);
  const manifestEntry =
    zip.getEntry(BUNDLE_MANIFEST) ||
    zip.getEntries().find((e) => e.entryName.endsWith(BUNDLE_MANIFEST));

  if (!manifestEntry) {
    throw new Error(`Bundle missing ${BUNDLE_MANIFEST}`);
  }

  const manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as RealmBundleManifest;

  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Unsupported bundle schema version: ${manifest.schemaVersion}`);
  }

  if (manifest.sessionId !== expectedSessionId) {
    throw new Error(
      `Bundle sessionId (${manifest.sessionId}) does not match URL (${expectedSessionId})`
    );
  }

  const sessionDir = getSessionDir(expectedSessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (name.includes('..')) continue;

    const target = path.join(sessionDir, path.basename(name));
    fs.writeFileSync(target, entry.getData());
  }

  fs.writeFileSync(
    path.join(sessionDir, 'metadata.json'),
    JSON.stringify(
      {
        sessionId: expectedSessionId,
        importedAt: new Date().toISOString(),
        realmKey: manifest.realmKey,
        realmKeySource: manifest.realmKeySource,
        revision: manifest.revision ?? 0,
        profile: manifest.profile ?? 'public',
        exporter: manifest.exporter,
      },
      null,
      2
    )
  );

  return { manifest, sessionDir };
}
