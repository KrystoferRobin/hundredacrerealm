import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Native {
  id: string;
  name: string;
  attributeBlocks: {
    this: {
      native: string;
      fame: string;
      notoriety: string;
      base_price: string;
      vulnerability: string;
      armored?: string;
    };
    light: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
    dark: {
      move_speed: string;
      attack_speed: string;
      strength: string;
      chit_color: string;
    };
  };
}

interface NativeGroup {
  dwelling: string;
  displayName: string;
  natives: Native[];
}

export async function GET() {
  try {
    const nativesDir = path.join(process.cwd(), 'coregamedata', 'natives');
    
    if (!fs.existsSync(nativesDir)) {
      return NextResponse.json(
        { error: 'Natives directory not found' },
        { status: 404 }
      );
    }

    const dwellingFolders = fs.readdirSync(nativesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const nativeGroups: NativeGroup[] = [];

    for (const dwelling of dwellingFolders) {
      const dwellingPath = path.join(nativesDir, dwelling);
      const files = fs.readdirSync(dwellingPath);
      
      const natives: Native[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dwellingPath, file);
          const nativeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          natives.push(nativeData);
        }
      }

      if (natives.length > 0) {
        // Get display name by removing "_Dwelling" suffix or using native name from first file
        let displayName = dwelling;
        if (dwelling.endsWith('_Dwelling')) {
          displayName = dwelling.replace('_Dwelling', '');
        } else if (natives[0]?.attributeBlocks?.this?.native) {
          displayName = natives[0].attributeBlocks.this.native;
        }

        nativeGroups.push({
          dwelling,
          displayName,
          natives: natives.sort((a, b) => a.name.localeCompare(b.name))
        });
      }
    }

    // Sort groups alphabetically by display name
    nativeGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ nativeGroups });

  } catch (error) {
    console.error('Error reading natives:', error);
    return NextResponse.json(
      { error: 'Failed to load natives' },
      { status: 500 }
    );
  }
} 