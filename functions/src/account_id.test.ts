import {
  newAccountId,
  isAccountId,
  accountIdIndexDocId,
  cleanAliases,
} from './account_id';

/*
 * Одно имя аккаунта: тесты на свойства, от которых зависит вся миграция.
 * Ошибка здесь стоила бы перепутанных аккаунтов у 4701 человека.
 */
describe('новое имя аккаунта', () => {
  it('уникально на большом объёме', () => {
    // Выдаём столько же имён, сколько живых аккаунтов, плюс запас.
    const ids = new Set(Array.from({ length: 10_000 }, () => newAccountId()));
    expect(ids.size).toBe(10_000);
  });

  it('узнаётся по форме и не путается со старыми именами', () => {
    expect(isAccountId(newAccountId())).toBe(true);
    // Всё, чем сегодня зовут человека, новым именем НЕ является.
    expect(isAccountId('6eccc17a-d04c-41e4-bc8a-2220073db43e')).toBe(false); // stable_id
    expect(isAccountId('MhJVdP5xdNQREmMSUqmtQNXshTA2')).toBe(false);          // firebaseAuthUid
    expect(isAccountId('')).toBe(false);
    expect(isAccountId(null)).toBe(false);
    expect(isAccountId('acc_ЗАГЛАВНЫЕ')).toBe(false);
    expect(isAccountId('acc_short')).toBe(false);
  });

  it('не выводится из старого имени', () => {
    // Имя, посчитанное из stable_id, поменялось бы вместе с источником —
    // то есть перестало бы быть постоянным. Случайность и есть гарантия.
    const a = newAccountId();
    const b = newAccountId();
    expect(a).not.toBe(b);
  });
});

describe('таблица соответствия', () => {
  it('один и тот же псевдоним даёт один и тот же документ', () => {
    expect(accountIdIndexDocId('stable-1')).toBe(accountIdIndexDocId('stable-1'));
    expect(accountIdIndexDocId('stable-1')).not.toBe(accountIdIndexDocId('stable-2'));
  });

  it('id документа всегда безопасен для Firestore', () => {
    // Инцидент 29.08: Firestore резервирует идентификаторы вида __x__, и
    // .doc('__index__') падает ДО обращения к сети. Хеш это исключает.
    for (const alias of ['__index__', 'a/b', '.', '..', 'x'.repeat(500), 'обычный-id']) {
      const id = accountIdIndexDocId(alias);
      expect(id).toMatch(/^alias_[0-9a-f]{64}$/);
      expect(id.includes('/')).toBe(false);
      expect(/^__.*__$/.test(id)).toBe(false);
    }
  });
});

describe('отбор псевдонимов', () => {
  it('убирает пустые, длинные и зарезервированные', () => {
    const out = cleanAliases([
      { alias: 'stable-1', kind: 'stable' },
      { alias: '   ', kind: 'auth' },
      { alias: '__index__', kind: 'stable' },
      { alias: 'x'.repeat(200), kind: 'provider' },
    ]);
    expect(out.map((x) => x.alias)).toEqual(['stable-1']);
  });

  it('не пропускает дубли — иначе индекс разъедется сам с собой', () => {
    const out = cleanAliases([
      { alias: 'same', kind: 'stable' },
      { alias: ' same ', kind: 'auth' },
      { alias: 'same', kind: 'provider' },
    ]);
    expect(out).toHaveLength(1);
  });

  it('сохраняет происхождение имени для разбора инцидентов', () => {
    const out = cleanAliases([
      { alias: 'a1', kind: 'auth' },
      { alias: 's1', kind: 'stable' },
      { alias: 'm1', kind: 'merged_stable' },
    ]);
    expect(out.map((x) => x.kind)).toEqual(['auth', 'stable', 'merged_stable']);
  });
});
