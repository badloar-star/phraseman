import { readFileSync } from 'fs';
import { join } from 'path';

// зачем: Q-COIN (b), координатор 01.10. Сторож проводки сверки монет:
// метка сверки закрыта от клиента правилами, функция экспортирована,
// инвентарь Account V2 знает поле (иначе unknown_field → hold аккаунта),
// число телефона не участвует в расчёте подъёма.

const root = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

test('coinReconcileV1 marker is server-only in Firestore Rules (update and create)', () => {
  const rules = read('firestore.rules');
  const updateGuard = rules.match(/function hasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  const createGuard = rules.match(/function newDocHasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  expect(updateGuard).toContain("'coinReconcileV1'");
  expect(createGuard).toContain("'coinReconcileV1'");
});

test('callable is exported and the client calls it by the same name', () => {
  expect(read('functions', 'src', 'index.ts')).toContain('export { coinReconcileV1 } from "./coin_reconcile_v1";');
  expect(read('app', 'community_packs', 'functionsClient.ts')).toContain("'coinReconcileV1'");
});

test('Account V2 inventory classifies the marker (no unknown_field hold)', () => {
  expect(read('functions', 'src', 'accounts_v2_migration', 'inventory.ts')).toContain("'coinReconcileV1'");
});

test('phone-supplied balance is log-only on the server', () => {
  const server = read('functions', 'src', 'coin_reconcile_v1.ts');
  const uses = server.split('\n').filter((line) => line.includes('clientVisibleBalance')
    && !line.trim().startsWith('*') && !line.trim().startsWith('//'));
  // Разрешено: разбор входа, тип, проброс в runCoinReconcileV1 и печать в лог.
  for (const line of uses) {
    expect(line).toMatch(/console\.log|rawClientBalance|clientVisibleBalance: number \| null|clientVisibleBalance \}\)|clientVisibleBalance = Number/);
  }
  expect(server).not.toMatch(/clientVisibleBalance\s*[-+*]/);
  expect(server).toContain("reason: 'level_spin_grant' as const");
});
