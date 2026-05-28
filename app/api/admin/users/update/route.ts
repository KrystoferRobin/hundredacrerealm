import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, loadUsers, saveUsers } from '@/lib/admin-auth';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newUsername, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const users = loadUsers();
    const currentUser = users.find(u => u.username === user.username);

    if (!currentUser || currentUser.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    if (newUsername && newUsername !== user.username) {
      if (users.some(u => u.username === newUsername)) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
      currentUser.username = newUsername;
    }

    currentUser.password = newPassword;

    if (!saveUsers(users)) {
      return NextResponse.json(
        { error: 'Failed to save user credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials updated successfully',
    });
  } catch (error) {
    console.error('Update credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
}
