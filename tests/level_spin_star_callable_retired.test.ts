import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем: серверный кошелёк монет, спины удалены (владелец 01.10, Q13).
// Сторож: спинов нет, серверный кошелёк монет `levelSpinStarGrant` есть,
// неизвестный источник — отказ. Клиентский контракт `{ operation }` не меняется.

const root = process.cwd();
const read = (...parts: string[]) => normalizeEol(fs.readFileSync(path.join(root, ...parts), 'utf8'));

test('server coin wallet callable exists under the old name and is exported', () => {
  const index = read('functions', 'src', 'index.ts');
  const wallet = read('functions', 'src', 'level_spin_star_grant.ts');
  expect(index).toContain('export { levelSpinStarGrant } from "./level_spin_star_grant";');
  expect(wallet).toContain('export const levelSpinStarGrant = onCall(HOT_CALLABLE_OPTIONS');
  expect(wallet).toContain('// зачем: серверный кошелёк монет, спины удалены (владелец 01.10)');
  expect(wallet).toContain("throw new HttpsError('unauthenticated', 'auth_required')");
  expect(wallet).not.toMatch(/enforceAppCheck\s*:\s*true/);
});

test('spin logic stays deleted: no server spin modules, no spin source in the wallet white list', () => {
  for (const retired of ['level_spin_merge.ts', 'level_spin_enrollment.ts', 'level_reward_spins.ts']) {
    expect(fs.existsSync(path.join(root, 'functions', 'src', retired))).toBe(false);
  }
  expect(fs.existsSync(path.join(root, 'app', 'local_level_spins.ts'))).toBe(false);
  const policy = read('functions', 'src', 'coin_wallet_policy.ts');
  expect(policy).toContain("'coin_wallet_source_not_allowed'");
  const sourcePatterns = policy.match(/const SOURCE_PATTERNS[\s\S]*?\] as const\);/)?.[0] ?? '';
  expect(sourcePatterns).toContain('report_reward_');
  expect(sourcePatterns).toContain('dailyjourney_');
  // зачем (D148, PM-080 318589878, Q109): g2c1_/g2cdj_ сняты — миграции подарков в монеты нет ни на клиенте, ни на сервере.
  expect(sourcePatterns).not.toContain('g2c1_');
  expect(sourcePatterns).not.toContain('g2cdj_');
  const prefixes = [...sourcePatterns.matchAll(/\[\/\^([a-z0-9_]+?)_\[/g)].map((m) => m[1]);
  // зачем (Ядро 25.10, прогон Ревизора): lessontogether_ — «Урок вместе», утверждён владельцем 22.10 (кнопка «А1 — lesson_together: да»,
  // 652953424); экзамен главы задан константой CHAPTER_EXAM_REQUEST_RE и сюда не попадает. g2c* по-прежнему запрещены (выше).
  expect(prefixes).toEqual(['report_reward', 'dailyjourney', 'lessontogether']);
  for (const prefix of prefixes) expect(prefix).not.toMatch(/spin|quest|video|level/i);
});

test('client keeps sending the exact composite to the same callable', () => {
  const client = read('app', 'level_spin_star_grants.ts');
  const functionsClient = read('app', 'community_packs', 'functionsClient.ts');
  const appLayout = read('app', '_layout.tsx');
  expect(client).toContain('commitPhoneStateNonMonetaryEconomyGrant');
  expect(client).toContain('callLevelSpinStarComposite(operation)');
  expect(client).toContain('requestFingerprint !== operation.requestFingerprint');
  expect(functionsClient).toContain("'levelSpinStarGrant'");
  expect(functionsClient).toContain('{ operation }');
  expect(functionsClient).toContain('operation: LevelSpinStarCreditExactResult');
  // Стартовый проход делит промис с одновременными чтениями монет (дедупликация, 04.10).
  expect(appLayout).toContain('recoverAndHydrateLevelSpinStarGrants(token, { shareInFlight: true })');
});

test('wallet limit counters are server-only in Firestore Rules', () => {
  const rules = read('firestore.rules');
  const updateGuard = rules.match(/function hasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  const createGuard = rules.match(/function newDocHasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  expect(updateGuard).toContain("'coinWalletLimitsV1'");
  expect(createGuard).toContain("'coinWalletLimitsV1'");
  expect(updateGuard).toContain("'stars'");
});
