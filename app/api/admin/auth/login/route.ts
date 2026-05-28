import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { getJwtSecret, loadUsers } from '@/lib/admin-auth';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const users = loadUsers();
    if (users.length === 0) {
      return NextResponse.json(
        {
          error:
            'Admin users are not configured. Copy data/admin-users.example.json to data/admin-users.json and set credentials.',
        },
        { status: 503 }
      );
    }

    const user = users.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = sign(
      {
        username: user.username,
        isAdmin: user.isAdmin,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      getJwtSecret()
    );

    const cookieStore = cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
    });

    return NextResponse.json({
      username: user.username,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Login error:', error);
    const message =
      error instanceof Error && error.message.includes('JWT_SECRET')
        ? 'Server misconfigured: JWT_SECRET is required'
        : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
