// зачем (владелец 21.10, №45 шаг 6; Ревизор п.6): две пробы почти всегда возвращали «нет документа» и всё равно шли в
// сеть: banned_users при каждой публикации профиля и daily_phrases в дни без серверной фразы. Сторож закрепляет кэш.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

describe('№45 шаг 6: пробы «нет документа» не ходят в сеть повторно', () => {
  it('публикация профиля берёт ответ про бан из кэша проверки на старте', () => {
    const layout = read('app/_layout.tsx');
    const snapshot = read('app/public_profile_snapshot.ts');

    expect(layout).toContain("const BAN_CACHE_KEY = 'ban_status_cached_v1';");
    expect(layout).toContain("const BAN_CACHE_AT_KEY = 'ban_status_cached_at_v1';");
    expect(snapshot).toContain("const BAN_STATUS_CACHE_KEY = 'ban_status_cached_v1';");
    expect(snapshot).toContain("const BAN_STATUS_CACHE_AT_KEY = 'ban_status_cached_at_v1';");
    expect(snapshot).toContain('const BAN_STATUS_CACHE_TRUST_MS = 6 * 60 * 60 * 1000;');

    const cacheCheck = snapshot.indexOf('const cachedBan = await readFreshBanStatusCache();');
    const networkRead = snapshot.indexOf("db.collection('banned_users').doc(stableId).get()");
    expect(cacheCheck).toBeGreaterThan(0);
    expect(networkRead).toBeGreaterThan(cacheCheck);
    expect(snapshot.slice(cacheCheck, networkRead)).toContain("if (cachedBan === 'banned')");

    // Кэш бана глобальный — он обязан стираться при смене аккаунта, иначе чужой ответ решил бы за нового владельца.
    expect(read('app/account_switch_leak_keys.ts')).toContain("'ban_status_cached_v1', 'ban_status_cached_at_v1'");
  });

  it('фраза дня запоминает пустой ответ сервера до конца дня', () => {
    const source = read('app/daily_phrase_system.ts');

    expect(source).toContain("const REMOTE_DAILY_PHRASE_MISS_KEY = 'daily_phrase_remote_miss_v1';");
    expect(source).toContain('await AsyncStorage.setItem(REMOTE_DAILY_PHRASE_MISS_KEY, date)');
    expect(source).toContain('const remote = missKnown ? null : await readRemoteTodayPhrase(today);');
    // Сбой сети отметку не ставит: она пишется только в успешной ветке без фразы.
    const failMarker = source.indexOf('remote read failed');
    const failBranch = source.slice(source.lastIndexOf('} catch (error) {', failMarker), failMarker + 200);
    expect(failBranch.startsWith('} catch (error) {')).toBe(true);
    expect(failBranch).not.toContain('REMOTE_DAILY_PHRASE_MISS_KEY');
    expect(read('app/cache_reset.ts')).toContain("'daily_phrase_remote_miss_v1'");
  });
});
