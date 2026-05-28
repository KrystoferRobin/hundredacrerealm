import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './realm-api-keys';

export function unauthorizedRealmApi(): NextResponse {
  return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
}

export function requireRealmApiKey(request: NextRequest) {
  const key = validateApiKey(request.headers.get('authorization'));
  if (!key) return { error: unauthorizedRealmApi() as NextResponse, key: null };
  return { error: null, key };
}
