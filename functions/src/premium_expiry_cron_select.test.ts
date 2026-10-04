/** PM-252 п.6 (04.10): ежедневный скан истечения Plus тянет только поля подписки, а не весь документ users. */
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, 'premium_expiry_cron.ts'), 'utf8');

test('the sweep page query uses a field mask built from PREMIUM_AUTHORITY_FIELDS', () => {
  const sweep = source.slice(source.indexOf('export async function sweepExpiredPremium'));
  expect(sweep).toContain(".select(...PREMIUM_AUTHORITY_FIELDS.map((field) => `progress.${field}`))");
  // Решение по-прежнему по полному документу в транзакции.
  expect(sweep).toContain('const current = await tx.get(doc.ref);');
});

test('every field the expiry predicate reads is inside the mask', () => {
  const predicate = source.slice(source.indexOf('export function planExpiryDeactivation'), source.indexOf('type SweepStats'));
  const mask = source.slice(source.indexOf('const PREMIUM_AUTHORITY_FIELDS = ['), source.indexOf('] as const;', source.indexOf('const PREMIUM_AUTHORITY_FIELDS')));
  const read = new Set([...predicate.matchAll(/data\.([a-z_]+)/g)].map((m) => m[1]));
  for (const field of read) expect(mask).toContain(`'${field}'`);
});
