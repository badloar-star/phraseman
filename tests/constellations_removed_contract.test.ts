import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Constellations removal contract', () => {
  test('removes all active client and server integration points', () => {
    const activeSources = [
      'app/arena_lobby.tsx',
      'app/_layout.tsx',
      'app/remote_flags.ts',
      'app/premium_context.ts',
      'app/paywall_copy.ts',
      'functions/src/index.ts',
      'functions/src/openai_jobs_config.ts',
      'functions/package.json',
      'firestore.rules',
      'firestore.indexes.json',
    ].map(read).join('\n');

    expect(activeSources).not.toMatch(/constellation/i);
    expect(fs.existsSync(path.join(root, 'app/constellation_match.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'app/services/constellations_db.ts'))).toBe(false);
    const serverDir = path.join(root, 'functions/src/constellations');
    expect(fs.existsSync(serverDir) ? fs.readdirSync(serverDir) : []).toEqual([]);
  });
});
