import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('tournament emoji reactions temporary shutdown', () => {
  test('disables reaction transport and hides the reaction controls', () => {
    const client = read('app/tournament_client.ts');
    const lobby = read('app/tournament_lobby.tsx');

    expect(client).toContain('export const TOURNAMENT_REACTIONS_ENABLED = false;');
    expect(client).toContain('const reactionsActive = active && TOURNAMENT_REACTIONS_ENABLED;');
    expect(client).toContain('if (!roomId || !reactionsActive) return;');
    expect(client).toContain('if (!TOURNAMENT_REACTIONS_ENABLED || !roomId || !activeRef.current) return false;');

    expect(lobby).toContain('TOURNAMENT_REACTIONS_ENABLED,');
    expect(lobby).toContain('{TOURNAMENT_REACTIONS_ENABLED ? (');
  });
});
