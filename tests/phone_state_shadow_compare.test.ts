import {
  mirrorProjection,
  persistLegacyPersonalProgressScalar,
} from '../modules/phone-state/legacy_mirror';
import { compareDomain, toShadowDiagnostic } from '../modules/phone-state/shadow_compare';

function legacyStorage(initial: Readonly<Record<string, string>>) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
  };
}

test('comparison classifies known semantic differences per domain', () => {
  // зачем (10.10): опыта в 2.0 нет — числовой счётчик сравнивается как обычное поле (field_mismatch), отдельной
  // ветки «телефон впереди на N» больше не производится.
  expect(compareDomain('streak', { legacy: 3, phone: 4 })).toEqual({
    kind: 'field_mismatch', counts: { mismatched: 1 },
  });
  expect(compareDomain('lessons', { legacy: [1, 2], phone: [1, 2, 3] }).kind)
    .toBe('phone_superset');
});

test('legacy mirror never lowers a legacy monotonic value', async () => {
  const storage = legacyStorage({ user_total_xp: '120' });
  await mirrorProjection(storage, 'xp', { total: 110 });
  expect(await storage.getItem('user_total_xp')).toBe('120');
});

test('legacy scalar facade is restricted to canonical progress mirrors', async () => {
  const storage = legacyStorage({});
  // зачем (10.10): из зеркал прогресса остался только streak_count — user_total_xp снят вместе с опытом.
  await persistLegacyPersonalProgressScalar(storage, 'streak_count', 3);
  expect(await storage.getItem('streak_count')).toBe('3');
  await expect(persistLegacyPersonalProgressScalar(
    storage, 'user_total_xp' as never, 42,
  )).rejects.toThrow('phone_state_legacy_progress_scalar_invalid');
  await expect(persistLegacyPersonalProgressScalar(
    storage, 'week_points' as never, 10,
  )).rejects.toThrow('phone_state_legacy_progress_scalar_invalid');
});

test('diagnostics contain bounded metadata and no compared payload', () => {
  const comparison = compareDomain('preferences', {
    legacy: { user_name: 'Alice', app_theme: 'light' },
    phone: { user_name: 'Bob', app_theme: 'dark' },
  });
  const diagnostic = toShadowDiagnostic('preferences', comparison);
  expect(diagnostic).toEqual({
    schemaVersion: 'phone-state-shadow-diagnostic.v1',
    domain: 'preferences',
    kind: 'field_mismatch',
    counts: { mismatched: 2 },
  });
  expect(JSON.stringify(diagnostic)).not.toContain('Alice');
  expect(JSON.stringify(diagnostic)).not.toContain('Bob');
});
