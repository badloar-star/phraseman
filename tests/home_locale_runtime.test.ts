import fs from 'fs';
import path from 'path';

const HOME_SOURCE = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');
const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('home screen planned locale runtime copy', () => {
  it('uses explicit planned greeting pools instead of collapsing to RU/UK/ES', () => {
    expect(HOME_SOURCE).toContain('const HOME_GREETING_POOLS: Record<Lang, readonly string[]>');
    expect(HOME_SOURCE).toContain('const pool = HOME_GREETING_POOLS[lang] ?? HOME_GREETING_POOLS.ru;');
    expect(HOME_SOURCE).not.toContain("const pool = lang === 'uk' ? GREETINGS_UK : lang === 'es' ? GREETINGS_ES : GREETINGS_RU;");

    for (const locale of PLANNED_LOCALES) {
      expect(HOME_SOURCE).toContain(`${locale}: GREETINGS_`.replace('pt-BR', "'pt-BR'"));
    }
  });

  it('has no RU weekday fallback left (the week strip lived in Home V1, removed 01.10)', () => {
    // зачем: подписи дней недели рисовала только полоса недели Главной V1; V2 её не
    // показывает, таблица HOME_WEEK_DAYS удалена. Сторож не даёт вернуть RU-фолбэк.
    expect(HOME_SOURCE).not.toContain("const weekDays = lang === 'uk'");
  });
});
