/**
 * Сторож: banned_users адресуется по stableUid, а не по authUid.
 *
 * зачем (владелец 2026-09-02): правило чтения требовало
 * `request.auth.uid == docId`, то есть authUid. Но документы этой коллекции
 * заводит админка по stableUid (functions/src/admin_access_controls.ts), и по
 * stableUid же их читает ВЕСЬ сервер: турниры, лиги, лидерборд, коды друзей,
 * сундук лиги, поиск друга.
 *
 * stableUid и authUid — РАЗНЫЕ значения по определению, поэтому владелец
 * физически не мог прочитать собственный документ бана. За вечер 02.09 в логе
 * бандлера 23 отказа `_layout:banned` и 19 `public_profile_snapshot:banDoc`.
 *
 * Авария была молчаливой: оба вызова fail-soft, поэтому проверка бана всегда
 * падала в «не забанен», а публикация публичного профиля тихо пропускала
 * проверку бана целиком. То есть забаненный человек оставался виден в поиске.
 *
 * Сработал — вернуть адресацию по stableUid, а не ослаблять проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const RULES_PATH = join(__dirname, '..', 'firestore.rules');
const APP_DIR = join(__dirname, '..', 'app');

describe('banned_users: адресация по stableUid', () => {
  const rules = readFileSync(RULES_PATH, 'utf8');

  it('правило чтения не сверяет docId с authUid', () => {
    const start = rules.indexOf('match /banned_users/{docId}');
    expect(start).toBeGreaterThan(-1);
    const block = rules.slice(start, rules.indexOf('}', rules.indexOf('allow write', start)));
    // Именно это условие и ломало чтение: request.auth.uid — это authUid.
    expect(block).not.toContain('request.auth.uid == docId');
    // Канонический помощник сверяет владельца по stableUid.
    expect(block).toContain('canonicalUserMatchesAuth(docId)');
  });

  it('запись остаётся строго админской', () => {
    const start = rules.indexOf('match /banned_users/{docId}');
    const block = rules.slice(start, rules.indexOf('}', rules.indexOf('allow write', start)));
    expect(block).toMatch(/allow write:\s*if isAdmin\(\);/);
  });

  it('клиентские читатели используют stableUid, а не authUid', () => {
    // Все три читателя обязаны спрашивать документ по каноничному id.
    for (const file of ['_layout.tsx', 'public_profile_snapshot.ts', 'firestore_friends.ts']) {
      const source = readFileSync(join(APP_DIR, file), 'utf8');
      const line = source
        .split('\n')
        .find((candidate) => candidate.includes("collection('banned_users')"));
      expect({ file, line: line ?? 'не найдено' }).toEqual({
        file,
        line: expect.stringMatching(/doc\((uid|stableId|myUid|stableUid)\)/),
      });
    }
  });
});
