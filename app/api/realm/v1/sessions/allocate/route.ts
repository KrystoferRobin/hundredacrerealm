import { NextRequest, NextResponse } from 'next/server';
import { requireRealmApiKey } from '@/lib/realm-api-request';
import { RealmIdentityInput, resolveRealmIdentity } from '@/lib/realm-identity';
import { allocateSession } from '@/lib/session-registry';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { error, key } = requireRealmApiKey(request);
  if (error) return error;

  try {
    const body = await request.json();
    const identityInput = (body.identity ?? {}) as RealmIdentityInput;

    const identityFields: RealmIdentityInput = {
      gamePort: identityInput.gamePort ?? body.gamePort,
      rseed: identityInput.rseed ?? body.rseed,
      gameTitle: identityInput.gameTitle ?? body.gameTitle,
      gamePass: identityInput.gamePass ?? body.gamePass,
      gameName: identityInput.gameName ?? body.gameName,
      characterKeyFingerprint:
        identityInput.characterKeyFingerprint ?? body.characterKeyFingerprint,
    };

    const hasIdentityFields = Object.values(identityFields).some(
      (v) => typeof v === 'string' && v.trim()
    );

    let realmKey = typeof body.realmKey === 'string' ? body.realmKey.trim() : '';
    let realmKeySource = typeof body.realmKeySource === 'string' ? body.realmKeySource : '';

    // Prefer server-side identity resolution when save metadata is present.
    if (hasIdentityFields) {
      const resolved = resolveRealmIdentity(identityFields);
      realmKey = resolved.realmKey;
      realmKeySource = resolved.realmKeySource;
    }

    if (!realmKey) {
      return NextResponse.json({ error: 'realmKey or identity is required' }, { status: 400 });
    }

    const gameTitle =
      typeof body.gameTitle === 'string'
        ? body.gameTitle
        : identityInput.gameTitle ?? undefined;

    const { entry, isNew } = allocateSession(
      {
        realmKey,
        realmKeySource: realmKeySource || 'client_supplied',
        parts: {},
      },
      gameTitle,
      key!.label
    );

    return NextResponse.json({
      sessionId: entry.sessionId,
      realmKey: entry.realmKey,
      realmKeySource: entry.realmKeySource,
      isNew,
      revision: entry.revision,
      gameTitle: entry.gameTitle,
    });
  } catch (err) {
    console.error('allocate session error:', err);
    return NextResponse.json({ error: 'Failed to allocate session' }, { status: 500 });
  }
}
