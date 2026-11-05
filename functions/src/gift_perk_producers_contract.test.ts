import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('canonical server-owned gift perk producers', () => {
  // зачем (150, красные тесты оплаты/подарков): сторож сторожил УДАЛЁННОЕ — скрипты deploy:safe / deploy:community-gift ушли из package.json, а level-gift / level-spin pack callables
  // удалены из community_packs.ts целиком (там же комментарий причины). Пины переписаны на текущее состояние: если скрипты вернутся — правило про broadcast/chain-shield действует; удалённые callables не должны вернуться.
  it('keeps authority callables in the selective deployment commands that exist', () => {
    const pkg = JSON.parse(read('../package.json')) as { scripts: Record<string, string> };
    for (const scriptName of ['deploy:safe', 'deploy:community-gift']) {
      const script = pkg.scripts[scriptName];
      if (script === undefined) continue;
      expect(script).not.toContain('functions:friendConsumeChainShield');
      expect(script).toContain('functions:globalBroadcastClaim');
    }
  });

  it('level-gift / level-spin pack callables stay retired (not exported from community_packs)', () => {
    const source = read('community_packs.ts');
    for (const name of ['levelGiftReserve', 'levelGiftActivatePackGift', 'levelSpinActivatePackGift']) {
      expect(source).not.toContain(`export const ${name}`);
    }
  });

});
