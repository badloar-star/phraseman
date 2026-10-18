// зачем (владелец 18.10 «Да, перенести», разбор fc30ae94a): база в eur3, функции входа выкладываются И в europe-west1 (рядом
// с базой), И в us-central1 (старые сборки зовут его по имени). Сторож: ни один из трёх вызовов входа не потерял ни регион.
import { authEnsureStableLink, authStampAnonOwnership } from './auth_identity';
import { authMergeStableAccounts } from './auth_merge';
import { AUTH_CALLABLE_REGIONS } from './callable_options';

const regionsOf = (fn: unknown): unknown => (fn as { __endpoint?: { region?: unknown } }).__endpoint?.region;

test('регионы входа: Европа рядом с базой и США для старых сборок', () => {
  expect(AUTH_CALLABLE_REGIONS).toEqual(['us-central1', 'europe-west1']);
});

test.each([
  ['authEnsureStableLink', authEnsureStableLink],
  ['authStampAnonOwnership', authStampAnonOwnership],
  ['authMergeStableAccounts', authMergeStableAccounts],
])('%s выкладывается в europe-west1 и в us-central1', (_name, fn) => {
  expect(regionsOf(fn)).toEqual(['us-central1', 'europe-west1']);
});
