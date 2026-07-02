import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'ConsentReverifyHost.tsx'), 'utf8');

describe('consent reverify modal contract', () => {
  it('asks a yes/no 16+ question instead of a birth-year wheel', () => {
    expect(source).toContain('Тебе уже есть 16?');
    expect(source).toContain('testID="reverify-age-yes"');
    expect(source).toContain('testID="reverify-age-no"');
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('Год рождения');
    // «Да» пишет тот же возрастной прокси, что онбординг новых пользователей.
    expect(source).toContain('new Date().getFullYear() - MIN_FULL_ACCESS_AGE');
  });

  it('blocks under-16 with an exit-only dead end and no persistence', () => {
    expect(source).toContain('Увы…');
    expect(source).toContain('testID="reverify-exit"');
    // iOS: exitApp() запрещён Apple (no-op) → честный Alert; Android — exitApp().
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain('BackHandler.exitApp()');
    // «Нет» НИЧЕГО не сохраняет: латч reverify_done пишется ровно в двух местах —
    // шорткат в гейте (решения уже есть) и submit-ветка «Да». При следующем
    // запуске модал показывается снова (защита от случайного тапа «Нет»).
    const latchWrites = source.match(/AsyncStorage\.setItem\(REVERIFY_DONE_KEY, '1'\)/g) ?? [];
    expect(latchWrites.length).toBe(2);
  });

  it('keeps analytics consent compact and non-anonymous', () => {
    expect(source).toContain('Разрешить собирать аналитику?');
    expect(source).toContain('Необязательно. Выбор можно изменить в настройках.');
    expect(source).toContain("allow: L('Разрешить'");
    expect(source).toContain("notNow: L('Не сейчас'");
    expect(source).not.toContain('Можно собирать анонимные данные');
    expect(source).not.toContain('анонимную статистику');
    expect(source).not.toContain('Если разрешишь, мы будем собирать');
  });
});
