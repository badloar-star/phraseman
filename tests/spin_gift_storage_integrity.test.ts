import {
  parseBonusEnergyStorageValue,
  parseStrictOwnedIdMap,
  parseStrictStringList,
  stableUniqueStrings,
} from '../app/spin_gift_storage_integrity';

describe('spin/gift storage integrity', () => {
  test('distinguishes absent, valid and malformed string lists', () => {
    const allowed = (value: string) => value === 'midnight' || value === 'lime';
    expect(parseStrictStringList(null, allowed)).toEqual({ status: 'absent', value: [] });
    expect(parseStrictStringList('["midnight","lime"]', allowed)).toEqual({
      status: 'valid', value: ['midnight', 'lime'],
    });
    expect(parseStrictStringList('{}', allowed)).toEqual({ status: 'malformed' });
    expect(parseStrictStringList('["midnight",false]', allowed)).toEqual({ status: 'malformed' });
    expect(parseStrictStringList('["unknown"]', allowed)).toEqual({ status: 'malformed' });
  });

  test('accepts only strict owned-id maps', () => {
    expect(parseStrictOwnedIdMap(null, (value) => value === true)).toEqual({ status: 'absent', value: {} });
    expect(parseStrictOwnedIdMap('{"a":true}', (value) => value === true)).toEqual({
      status: 'valid', value: { a: true },
    });
    expect(parseStrictOwnedIdMap('{"a":false}', (value) => value === true)).toEqual({ status: 'malformed' });
    expect(parseStrictOwnedIdMap('[]', (value) => value === true)).toEqual({ status: 'malformed' });
  });

  test('classifies bonus energy without silently repairing corruption', () => {
    expect(parseBonusEnergyStorageValue(null, 1_000)).toEqual({ status: 'absent' });
    expect(parseBonusEnergyStorageValue('{"amount":3,"expiresAt":2000}', 1_000)).toEqual({
      status: 'valid', value: { amount: 3, capacity: 3, expiresAt: 2_000 },
    });
    expect(parseBonusEnergyStorageValue('{"amount":3,"expiresAt":999}', 1_000)).toEqual({
      status: 'expired', value: { amount: 3, capacity: 3, expiresAt: 999 },
    });
    expect(parseBonusEnergyStorageValue('{"amount":0,"capacity":3,"expiresAt":2000}', 1_000)).toEqual({
      status: 'valid', value: { amount: 0, capacity: 3, expiresAt: 2_000 },
    });
    expect(parseBonusEnergyStorageValue('{"amount":0,"expiresAt":2000}', 1_000)).toEqual({ status: 'malformed' });
    expect(parseBonusEnergyStorageValue('{"amount":"3","expiresAt":2000}', 1_000)).toEqual({ status: 'malformed' });
    expect(parseBonusEnergyStorageValue('{bad', 1_000)).toEqual({ status: 'malformed' });
  });

  test('keeps the full immutable source-id set beyond 160 entries', () => {
    const ids = Array.from({ length: 201 }, (_, index) => `source-${index}`);
    expect(stableUniqueStrings([...ids, ids[0]!, ids[160]!])).toEqual(ids);
  });
});
