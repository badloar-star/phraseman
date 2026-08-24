import {
  auditPortableDomainOwnership,
  portableOwnerForKey,
  scanWriterFixture,
} from '../modules/phone-state/domain_ownership';

test('every portable inventory row and prefix has exactly one facade owner', () => {
  expect(auditPortableDomainOwnership()).toEqual({ unownedKeys: [], multiplyOwnedKeys: [] });
});

test('writer scanner reports an unauthorized literal write with owner and line', () => {
  expect(scanWriterFixture("const x = 1;\nAsyncStorage.setItem('user_total_xp', '1')"))
    .toEqual([{ key: 'user_total_xp', owner: 'progress', line: 2 }]);
});

test('prefix ownership is exact and external/device-only keys remain outside portable authority', () => {
  expect(portableOwnerForKey('lesson42_done')).toBe('progress');
  expect(portableOwnerForKey('account_delete_pending_auth_v1')).toBeNull();
});
