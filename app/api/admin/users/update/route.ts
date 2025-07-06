import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const USERS_FILE = path.join(process.cwd(), 'data', 'admin-users.json');

// Middleware to check authentication
async function checkAuth(request: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token');

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token.value, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Load users from file
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  
  // Default users if file doesn't exist
  return [
    {
      username: 'admin',
      password: 'admin123',
      isAdmin: true
    }
  ];
}

// Save users to file
function saveUsers(users: any[]) {
  try {
    // Ensure data directory exists
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

export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  
  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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
    const currentUser = users.find((u: any) => u.username === user.username);

    if (!currentUser || currentUser.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update user credentials
    if (newUsername && newUsername !== user.username) {
      // Check if new username already exists
      if (users.some((u: any) => u.username === newUsername)) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
      currentUser.username = newUsername;
    }

    currentUser.password = newPassword;

    // Save updated users
    if (!saveUsers(users)) {
      return NextResponse.json(
        { error: 'Failed to save user credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials updated successfully'
    });

  } catch (error) {
    console.error('Update credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    );
  }
} 