// Раунд 2 удобств, Статистика п.3 (одобрено владельцем 05.11): раскрытый блок «Все показатели» запоминается локально, без Firestore.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/streak_stats.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Статистика: «Все показатели» помнит раскрытый блок', () => {
  it('ключ памяти есть, читается один раз при входе и пишется при переключении', () => {
    expect(src).toContain("const STATS_LIFETIME_EXPANDED_KEY = 'stats_lifetime_expanded_v1';");
    expect(src).toContain('AsyncStorage.getItem(STATS_LIFETIME_EXPANDED_KEY)');
    // «свёрнуто» = пустая строка, не removeItem (храповик progress_preservation_owner_lock)
    expect(src).toContain("AsyncStorage.setItem(STATS_LIFETIME_EXPANDED_KEY, nextKind ?? '')");
    expect(src).not.toContain('AsyncStorage.removeItem(STATS_LIFETIME_EXPANDED_KEY)');
  });
  it('сбои чтения и записи не молчат (причина в журнале)', () => {
    expect(src).toContain('[STATS-LIFETIME] чтение раскрытого блока не удалось');
    expect(src).toContain('[STATS-LIFETIME] запись раскрытого блока не удалась');
  });
  it('никаких обращений к Firestore из этого кода', () => {
    const block = src.slice(src.indexOf('stats_lifetime_expanded_v1'), src.indexOf('stats_lifetime_expanded_v1') + 200);
    expect(block).not.toMatch(/firestore/i);
  });
});
