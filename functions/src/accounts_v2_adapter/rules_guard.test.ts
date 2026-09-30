import * as fs from 'fs';
import * as path from 'path';

// зачем (Account V2): accounts_v2/** читает и пишет только сервер. Правила
// Firestore объединяются через ИЛИ, поэтому админский catch-all
// `match /{collection}/{document=**}` открыл бы коллекцию браузерной админке,
// если её нет в списке исключений. Сторож держит обе защиты.
const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');

describe('Account V2 firestore rules guard', () => {
  test('accounts_v2/** полностью закрыт явным deny', () => {
    expect(rules).toMatch(/match \/accounts_v2\/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  });

  test('админский catch-all исключает accounts_v2', () => {
    // зачем: строка встречается и в комментариях — ищем настоящий блок (начало строки + `{`).
    const found = /\n\s*match \/\{collection\}\/\{document=\*\*\} \{/.exec(rules);
    expect(found).not.toBeNull();
    const start = found ? found.index : -1;
    const block = rules.slice(start, rules.indexOf(';', start));
    expect(block).toContain("collection != 'accounts_v2'");
  });

  test('индексы: *Json и fingerprint исключены, TTL на expireAt в accounts_v2_ops', () => {
    // зачем: большие строковые поля в индексах удорожают запись и упираются в лимит
    // индексных записей; TTL чистит квитанции (срок 180 суток — callable адаптера).
    const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../firestore.indexes.json'), 'utf8')) as {
      fieldOverrides: { collectionGroup: string; fieldPath: string; ttl?: boolean; indexes: unknown[] }[];
    };
    const has = (group: string, field: string): boolean => cfg.fieldOverrides.some(
      (o) => o.collectionGroup === group && o.fieldPath === field && Array.isArray(o.indexes) && o.indexes.length === 0,
    );
    for (const field of ['operationIdJson', 'fingerprint', 'expireAt']) expect(has('accounts_v2_ops', field)).toBe(true);
    for (const field of ['stateJson', 'entityIdJson', 'lastOperationIdJson']) expect(has('accounts_v2_entities', field)).toBe(true);
    expect(cfg.fieldOverrides.some((o) => o.collectionGroup === 'accounts_v2_ops' && o.fieldPath === 'expireAt' && o.ttl === true)).toBe(true);
  });

  test('нет ни одного allow на accounts_v2 кроме if false', () => {
    const allows = rules.match(/match \/accounts_v2[^{]*\{[^}]*\}/g) ?? [];
    expect(allows.length).toBeGreaterThan(0);
    for (const block of allows) expect(block).not.toMatch(/allow [a-z, ]+: if (?!false)/);
  });
});
