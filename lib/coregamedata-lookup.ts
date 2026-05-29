import fs from 'fs';
import path from 'path';

export type DenizenKind = 'native' | 'monster';

export interface DenizenLookupResult {
  id: string;
  name: string;
  denizenKind: DenizenKind;
  attributeBlocks: Record<string, Record<string, string>>;
  parts?: DenizenLookupResult[];
}

function readJsonFile(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function findNativeByName(
  name: string,
  coreDataDir: string
): DenizenLookupResult | null {
  const nativesDir = path.join(coreDataDir, 'natives');
  if (!fs.existsSync(nativesDir)) return null;

  const dwellings = fs.readdirSync(nativesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dwelling of dwellings) {
    const dwellingPath = path.join(nativesDir, dwelling);
    const files = fs.readdirSync(dwellingPath).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const data = readJsonFile(path.join(dwellingPath, file)) as {
        id?: string;
        name?: string;
        attributeBlocks?: Record<string, Record<string, string>>;
      } | null;

      if (!data?.name || data.name !== name) continue;

      return {
        id: data.id || file.replace('.json', ''),
        name: data.name,
        denizenKind: 'native',
        attributeBlocks: data.attributeBlocks || {},
      };
    }
  }

  return null;
}

function monsterToResult(data: {
  id?: string;
  name: string;
  attributeBlocks?: Record<string, Record<string, string>>;
  parts?: Array<{
    id?: string;
    name: string;
    attributeBlocks?: Record<string, Record<string, string>>;
  }>;
}): DenizenLookupResult {
  return {
    id: data.id || data.name,
    name: data.name,
    denizenKind: 'monster',
    attributeBlocks: data.attributeBlocks || {},
    parts: data.parts?.map((part) => ({
      id: part.id || part.name,
      name: part.name,
      denizenKind: 'monster' as const,
      attributeBlocks: part.attributeBlocks || {},
    })),
  };
}

export function findMonsterByName(
  name: string,
  coreDataDir: string
): DenizenLookupResult | null {
  const monstersDir = path.join(coreDataDir, 'monsters');
  if (!fs.existsSync(monstersDir)) return null;

  const files = fs.readdirSync(monstersDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const data = readJsonFile(path.join(monstersDir, file)) as {
      id?: string;
      name?: string;
      attributeBlocks?: Record<string, Record<string, string>>;
      parts?: Array<{
        id?: string;
        name: string;
        attributeBlocks?: Record<string, Record<string, string>>;
      }>;
    } | null;

    if (!data?.name) continue;

    if (data.name === name) {
      return monsterToResult({ ...data, name: data.name });
    }

    for (const part of data.parts || []) {
      if (part.name === name) {
        return {
          id: part.id || part.name,
          name: part.name,
          denizenKind: 'monster',
          attributeBlocks: part.attributeBlocks || {},
        };
      }
    }
  }

  return null;
}

export function findDenizenByName(
  name: string,
  coreDataDir: string
): DenizenLookupResult | null {
  return (
    findNativeByName(name, coreDataDir) ||
    findMonsterByName(name, coreDataDir)
  );
}
