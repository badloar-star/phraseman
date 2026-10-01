import fs from 'node:fs';
import path from 'node:path';

/**
 * зачем: Q5 (координатор 01.10) — ауры и «Студия персонажа» удалены в 2.0 (D61):
 * аватар = монета ранга. В админке не должно остаться «Нимба» и архивов аур.
 */
const root = path.resolve(__dirname, '..');
const beta = fs.readFileSync(path.join(root, 'admin', 'v2', 'beta_testers.html'), 'utf8');

describe('admin aura surfaces removed (Q5)', () => {
  it('beta testers page no longer grants or shows the «Нимб» aura', () => {
    expect(beta).not.toMatch(/Нимб|aura-nimbus|NIMBUS_AURA_ID/u);
    expect(beta).not.toContain("'progress.user_avatar_aura'");
    expect(beta).not.toContain("'progress.avatar_aura_owned_v1'");
    expect(beta).toContain("'progress.beta_tester': 'true'");
  });

  it('aura archives are gone from the admin hosting folder', () => {
    expect(fs.existsSync(path.join(root, 'admin', 'v2', 'avatar-auras'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'admin', 'v2', 'season-auras'))).toBe(false);
  });
});
