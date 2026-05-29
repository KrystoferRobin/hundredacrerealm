import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Rebuild public/stats/master_stats.json from all parsed sessions.
 * Powers the Hall of Fame and character stats APIs.
 */
export function rebuildMasterStats(): void {
  const script = path.join(process.cwd(), 'scripts', 'build_master_stats.js');
  if (!fs.existsSync(script)) {
    throw new Error('build_master_stats.js not found');
  }

  execSync(`node "${script}"`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
}
