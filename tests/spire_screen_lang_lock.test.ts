// зачем (п.76 владельца: английский интерфейс входит в R1; Шпиль только ru/uk; координатор 15.10): сам экран Шпиля подчиняется замку по языку интерфейса —
// и при прямом маршруте /spire, и при смене языка на открытом экране показывается SpireLockedState, а не английские подписи с русскими заданиями.
import { readFileSync } from 'fs';
import { join } from 'path';
import { spireScreenLangLock } from '../components/spire/spire_screen_lang_lock';

const home = readFileSync(join(__dirname, '..', 'components', 'spire', 'SpireHomeScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: экран и язык интерфейса', () => {
  it('случай 1 — прямой маршрут /spire при en: экран заперт', () => {
    const lock = spireScreenLangLock('en');
    expect(lock.locked).toBe(true);
    expect(lock.decision).toMatchObject({ allowed: false, lang: 'en', reason: 'ui_lang_not_supported' });
  });

  it('случай 2 — смена языка на открытом экране: ru → открыт, en → заперт, обратно на uk → снова открыт', () => {
    const seen = ['ru', 'en', 'uk', 'es', 'pt-BR'].map((lang) => [lang, spireScreenLangLock(lang).locked] as const);
    expect(seen).toEqual([['ru', false], ['en', true], ['uk', false], ['es', true], ['pt-BR', true]]);
  });

  it('язык ещё неизвестен (первый кадр холодного старта) — замок, а не чужой язык', () => {
    for (const lang of [null, undefined, '']) {
      const lock = spireScreenLangLock(lang);
      expect(lock.locked).toBe(true);
      expect(lock.decision.reason).toBe('ui_lang_unknown');
    }
  });

  it('экран: unlocked учитывает замок, а SpireLockedState отдаётся до экрана загрузки', () => {
    expect(home).toMatch(/const langLock = spireScreenLangLock\(lang\);/);
    expect(home).toMatch(/const unlocked = config !== null && config\.enabled === true && !langLock\.locked;/);
    const locked = home.indexOf('if (langLock.locked) return <View style={s.root}><SpireLockedState lang={lang} /></View>;');
    expect(locked).toBeGreaterThan(0);
    expect(locked).toBeLessThan(home.indexOf('if (config === null) return <SpireHomeSkeleton lang={lang} />;'));
  });

  it('журнал [SPIRE-GATE] screen: решение, язык, причина, итог — одна строка на смену', () => {
    expect(home).toMatch(/\[SPIRE-GATE\] screen[\s\S]*?lang: langLock\.decision\.lang[\s\S]*?allowed: langLock\.decision\.allowed[\s\S]*?reason: langLock\.decision\.reason[\s\S]*?result:/);
    expect(home).toMatch(/if \(lastLangLockKeyRef\.current === key\) return;/);
  });
});
