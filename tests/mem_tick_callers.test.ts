// зачем (координатор 12.10, «Настройки» перечитывают users/query): [MEM-TICK] показывает чтения Firestore по вызывающему
// (сеть / кэш / в полёте / ошибка / подписка) и топ создателей таймаутов — помощники разбора и свёртки.
import fs from 'fs';
import path from 'path';

import { callerOf, summarizeReads, topCallers, type ReadStat } from '../app/mem_tick';

describe('[MEM-TICK] помощники вызывающих', () => {
  it('вызывающий — два кадра над обёрткой, без адресов бандла', () => {
    const stack = [
      'Error',
      '    at wrapped (http://localhost:8081/index.bundle:1:2)',
      '    at loadSettingsProfile (http://localhost:8081/index.bundle?x:10:5)',
      '    at SettingsScreen (http://localhost:8081/index.bundle:20:1)',
    ].join('\n');
    expect(callerOf(stack)).toBe('loadSettingsProfile <- SettingsScreen');
    expect(callerOf(undefined)).toBe('unknown');
  });

  it('топ создателей таймаутов — по убыванию, не больше N', () => {
    const counts = new Map([['a', 3], ['b', 10], ['c', 1], ['d', 7]]);
    expect(topCallers(counts, 2)).toEqual({ b: 10, d: 7 });
  });

  it('свёртка чтений — только ненулевые поля, пустые записи пропускаются', () => {
    const empty: ReadStat = { network: 0, cache: 0, pending: 0, error: 0, listen: 0 };
    const stats = new Map<string, ReadStat>([
      ['users|doc|loadProfile', { ...empty, network: 2, cache: 1 }],
      ['query|query|loadFriends', { ...empty, pending: 1 }],
      ['users|doc_listen|watch', { ...empty, listen: 1 }],
      ['x|doc|idle', empty],
    ]);
    expect(summarizeReads(stats)).toEqual({
      'users|doc|loadProfile': { network: 2, cache: 1 },
      'query|query|loadFriends': { pending: 1 },
      'users|doc_listen|watch': { listen: 1 },
    });
  });

  it('сэмплер выключен в стор-сборке; окно продлевается сменой экрана (контракт по исходнику)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'mem_tick.ts'), 'utf8');
    expect(src).toContain("if (IS_STORE_RELEASE || typeof __DEV__ === 'undefined' || !__DEV__) {");
    expect(src).toContain('if (changed && active) {');
    expect(src).toContain('firestoreReadsByCaller: byCaller,');
    expect(src).toContain('timeoutsByCaller: topTimeouts,');
  });
});
