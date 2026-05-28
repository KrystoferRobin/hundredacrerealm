import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

export const USERS_FILE = path.join(process.cwd(), 'data', 'admin-users.json');

export interface AdminUser {
  username: string;
  password: string;
  isAdmin: boolean;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function loadUsers(): AdminUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
}

export function saveUsers(users: AdminUser[]): boolean {
  try {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

export async function getAuthUser(): Promise<{ username: string; isAdmin: boolean } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token');

  if (!token) {
    return null;
  }

  try {
    return verify(token.value, getJwtSecret()) as { username: string; isAdmin: boolean };
  } catch {
    return null;
  }
}
