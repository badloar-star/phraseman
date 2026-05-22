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

  it('uses explicit planned weekday labels instead of RU weekday fallback', () => {
    expect(HOME_SOURCE).toContain('const HOME_WEEK_DAYS: Record<Lang, readonly string[]>');
    expect(HOME_SOURCE).toContain('const weekDays = HOME_WEEK_DAYS[lang] ?? HOME_WEEK_DAYS.ru;');
    expect(HOME_SOURCE).not.toContain("const weekDays = lang === 'uk'");

    expect(HOME_SOURCE).toContain("'pt-BR': ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']");
    expect(HOME_SOURCE).toContain("vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']");
    expect(HOME_SOURCE).toContain("id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']");
    expect(HOME_SOURCE).toContain("tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']");
    expect(HOME_SOURCE).toContain("pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']");
  });
});
