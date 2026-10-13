// зачем (правило 10г «нет пустого экрана», координатор 13.10): экран Шпиля на холодном старте и тренировка swipe до решения по доступу не рисуют пустоту —
// Шпиль даёт скелет по форме (заголовок настоящий), swipe — панель «Готовим тренировку…» без платного контента. Контракт по строкам файлов.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('первый кадр без пустоты', () => {
  it('Шпиль: config === null → SpireHomeSkeleton (testID spire-loading, настоящий заголовок, башня 400 и карточка этажа 72), журнал [SPIRE-FIRSTFRAME]', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    const skeleton = read('components/spire/SpireHomeSkeleton.tsx');
    expect(home).toContain('if (config === null) return <SpireHomeSkeleton lang={lang} />;');
    expect(home).not.toMatch(/if \(config === null\) return <View style=\{s\.root\} testID="spire-loading" \/>;/);
    expect(home).toContain('[SPIRE-FIRSTFRAME]');
    expect(skeleton).toContain('testID="spire-loading"');
    expect(skeleton).toMatch(/spireText\(lang, 'title'\)/);
    expect(skeleton).toMatch(/const TOWER_H = 400;/);
    expect(skeleton).toMatch(/const INFO_H = 72;/);
    // статично: без бесконечной анимации и без обводок
    expect(skeleton).not.toMatch(/withRepeat|Animated\.loop|borderWidth|borderColor/);
  });

  it('Шпиль: замок по языку по-прежнему отдаётся ДО скелета (скелет не мигает под замком)', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    const locked = home.indexOf('if (langLock.locked) return');
    const skel = home.indexOf('if (config === null) return <SpireHomeSkeleton');
    expect(locked).toBeGreaterThan(0);
    expect(locked).toBeLessThan(skel);
  });

  it('swipe: до accessResolved — панель ожидания, а не null; платного контента в ветке нет', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    const at = swipe.indexOf('  if (!accessResolved) {\n    return (');
    expect(at).toBeGreaterThan(0);
    const branch = swipe.slice(at, swipe.indexOf('\n  }\n', at));
    expect(branch).toContain('testID="flashcards-swipe-access-pending"');
    expect(branch).toContain('PracticeStatePanel');
    expect(branch).not.toMatch(/renderScreen|renderSelect|renderPlay|selectedSources|currentPrompt|trainingCards/);
    expect(swipe).not.toMatch(/if \(!accessResolved\) return null;/);
  });
});
