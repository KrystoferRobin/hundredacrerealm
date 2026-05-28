import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DISPLAY_ARTIFACTS = [
  'parsed_session.json',
  'map_data.json',
  'map_locations.json',
  'game_state.json',
  'character_stats.json',
  'scoring.json',
  'character_inventories.json',
  'final_scores.json',
  'enhanced_session.json',
  'map_state_data.json',
  'item_cache.json',
  'session_listing.json',
  'session_titles.json',
  'metadata.json',
  'manifest.json',
];

export function getDisplayArtifacts(): string[] {
  return [...DISPLAY_ARTIFACTS];
}

export function runSessionPipeline(sessionDir: string): void {
  if (!fs.existsSync(sessionDir)) {
    throw new Error(`Session directory not found: ${sessionDir}`);
  }

  const script = path.join(process.cwd(), 'scripts', 'run-session-pipeline.js');
  if (!fs.existsSync(script)) {
    throw new Error('run-session-pipeline.js not found');
  }

  execSync(`node "${script}" "${sessionDir}"`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
}

export function sessionIsDisplayReady(sessionDir: string): boolean {
  return (
    fs.existsSync(path.join(sessionDir, 'parsed_session.json')) &&
    fs.existsSync(path.join(sessionDir, 'map_data.json')) &&
    fs.existsSync(path.join(sessionDir, 'map_locations.json'))
  );
}
