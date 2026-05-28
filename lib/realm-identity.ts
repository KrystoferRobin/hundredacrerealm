import crypto from 'crypto';

/**
 * Canonical identity for deduplicating uploads of the same RealmSpeak table.
 * Mirrors Java GameIdentityExtractor.
 */
export interface RealmIdentityInput {
  gamePort?: string | null;
  rseed?: string | null;
  gameTitle?: string | null;
  gamePass?: string | null;
  gameName?: string | null;
  characterKeyFingerprint?: string | null;
}

export interface ResolvedRealmIdentity {
  realmKey: string;
  realmKeySource: string;
  parts: Record<string, string>;
}

export function resolveRealmIdentity(input: RealmIdentityInput): ResolvedRealmIdentity {
  const parts: Record<string, string> = {};

  if (input.gamePort?.trim()) {
    parts.gamePort = input.gamePort.trim();
  }
  if (input.rseed?.trim()) {
    parts.rseed = input.rseed.trim();
  }
  if (input.gameTitle?.trim()) {
    parts.gameTitle = input.gameTitle.trim();
  }
  if (input.gamePass?.trim()) {
    parts.gamePass = input.gamePass.trim();
  }
  if (input.gameName?.trim()) {
    parts.gameName = input.gameName.trim();
  }
  if (input.characterKeyFingerprint?.trim()) {
    parts.characterKeys = input.characterKeyFingerprint.trim();
  }

  // Hosted online games: gp__ is shared by all players on the same table.
  if (parts.gamePort) {
    return {
      realmKey: sha256(`port:${parts.gamePort}`),
      realmKeySource: 'host_game_port',
      parts,
    };
  }

  const seedTitle = [parts.rseed, parts.gameTitle, parts.gamePass].filter(Boolean).join('|');
  if (seedTitle) {
    return {
      realmKey: sha256(`seed:${seedTitle}`),
      realmKeySource: 'rseed_and_host_title',
      parts,
    };
  }

  if (parts.characterKeys) {
    return {
      realmKey: sha256(`roster:${parts.characterKeys}`),
      realmKeySource: 'character_roster',
      parts,
    };
  }

  if (parts.gameName && parts.rseed) {
    return {
      realmKey: sha256(`solo:${parts.rseed}|${parts.gameName}`),
      realmKeySource: 'rseed_and_game_name',
      parts,
    };
  }

  throw new Error(
    'Could not derive a stable realm identity. Include gamePort (hosted games) or rseed + gameTitle.'
  );
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
