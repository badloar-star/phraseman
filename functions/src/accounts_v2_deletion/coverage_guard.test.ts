import * as fs from 'fs';
import * as path from 'path';
import { ACCOUNTS_V2_COLLECTIONS, accountsV2EntityPath, accountsV2UidPathSafe } from '../accounts_v2_adapter/firestore_port';
import { ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS } from './firestore_ports';
import {
  ACCOUNTS_V2_DELETION_RECEIPTS_COLLECTION,
  ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER,
  ACCOUNTS_V2_DELETION_TTL_FIELD,
  deletionReceiptPath,
} from './receipt';

/*
 * Account V2, Пакет 4 — сторож полноты удаления.
 * зачем: удаление «доказуемо полное» только пока список удаляемых коллекций
 * совпадает со схемой. Новая коллекция под accounts_v2/{uid}, о которой забыли
 * здесь, пережила бы удаление аккаунта. Ядро дочищает и неизвестные
 * подколлекции, но схема обязана быть известна явно — сторож ломает сборку.
 */

const ROOT = path.resolve(__dirname, '../../..');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const indexes = JSON.parse(fs.readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8')) as {
  indexes: { collectionGroup: string }[];
  fieldOverrides: { collectionGroup: string; fieldPath: string; ttl?: boolean; indexes: unknown[] }[];
};
const portSource = fs.readFileSync(path.join(__dirname, '..', 'accounts_v2_adapter', 'firestore_port.ts'), 'utf8');

describe('полнота удаления accounts_v2', () => {
  test('удаляются ровно коллекции адаптера', () => {
    expect([...ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS].sort()).toEqual(Object.values(ACCOUNTS_V2_COLLECTIONS).sort());
  });

  test('адаптер строит пути только через ACCOUNTS_V2_COLLECTIONS (нет обходных коллекций)', () => {
    const used = [...portSource.matchAll(/ACCOUNTS_V2_COLLECTIONS\.(\w+)/g)].map((match) => match[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const key of used) expect(Object.keys(ACCOUNTS_V2_COLLECTIONS)).toContain(key);
    // зачем фильтр: `${ROOT}/${uid}/` — проверка префикса сторожа, а не построение пути.
    const builders = (portSource.match(/`\$\{ROOT\}\/[^`]*`/g) ?? []).filter((item) => !item.endsWith('/`'));
    expect(builders).toEqual(['`${ROOT}/${uid}/${collection}/${docId}`']);
  });

  test('каждая группа accounts_v2_* из индексов либо удаляется, либо квитанция', () => {
    const groups = new Set([
      ...indexes.indexes.map((item) => item.collectionGroup),
      ...indexes.fieldOverrides.map((item) => item.collectionGroup),
    ].filter((group) => group.startsWith('accounts_v2_')));
    for (const group of groups) {
      expect([...ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS, ACCOUNTS_V2_DELETION_RECEIPTS_COLLECTION]).toContain(group);
    }
  });

  test('квитанция: путь под accounts_v2 (закрыт deny), TTL-политика на expireAt (решение 14)', () => {
    expect(deletionReceiptPath('a'.repeat(64)).startsWith('accounts_v2/')).toBe(true);
    expect(rules).toMatch(/match \/accounts_v2\/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
    expect(indexes.fieldOverrides.some((item) => (
      item.collectionGroup === ACCOUNTS_V2_DELETION_RECEIPTS_COLLECTION
      && item.fieldPath === ACCOUNTS_V2_DELETION_TTL_FIELD
      && item.ttl === true
    ))).toBe(true);
  });
});

describe('Ремонт №1 P3-2: адаптер синхронизации не пишет в контейнер квитанций', () => {
  test.each([ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER, '_x', '_'])('uid %p отвергается адаптером', (uid) => {
    expect(accountsV2UidPathSafe(uid)).toBe(false);
    expect(() => accountsV2EntityPath(uid, 'a'.repeat(64))).toThrow('accounts_v2_uid_not_path_safe');
  });

  test('обычный uid Firebase по-прежнему принят', () => {
    expect(accountsV2UidPathSafe('OldUid1234567890abcdefghijkl')).toBe(true);
  });
});
