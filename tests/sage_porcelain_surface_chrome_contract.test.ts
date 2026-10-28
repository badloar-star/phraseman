import fs from 'fs';
import path from 'path';
import { DAILY_PHRASE_CHROME, dailyPhraseChromeFor } from '../app/daily_phrase_chrome';
import { themedToastChrome } from '../constants/themedToastChrome';
import { statsPageField, statsSoftBg, statsThemeAccent } from '../constants/statsThemeChrome';
import { SAGE_PORCELAIN } from '../constants/theme';

const ROOT = path.join(__dirname, '..');

function sourceEntry(relativePath: string, nextTheme: string): string {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const start = source.indexOf('sagePorcelain:');
  const end = source.indexOf(`  ${nextTheme}:`, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Sage Porcelain surface chrome contract', () => {
  it('defines a dedicated Sage Porcelain entry in every surface chrome map', () => {
    const sources: Array<[string, string]> = [
      // зачем: карта SETTINGS_SURFACES (components/settings/settingsSurfaces.ts) удалена 15.10 как мёртвый код прежней системы тем
      // (никто не импортировал, цвета Настроек берутся из liquidGlassTokens) — её проверок здесь больше нет.
      ['app/daily_phrase_chrome.ts', 'midnight'],
      ['constants/themedToastChrome.ts', 'midnight'],
      ['constants/statsThemeChrome.ts', 'midnight'],
      ['components/medalToastThemeStyles.ts', 'midnight'],
    ];

    for (const [file, nextTheme] of sources) {
      const entry = sourceEntry(file, nextTheme);
      expect(entry).not.toMatch(/as any|Partial|businessLight/);
      expect(entry).not.toMatch(/#(?:000000|0A0A0A)/i);
    }
  });

  it('resolves the Sage daily phrase and toast chrome from porcelain roles', () => {
    expect(DAILY_PHRASE_CHROME.sagePorcelain).toMatchObject({
      colors: ['#FCFDF9', '#F0F1EC', '#E1E5DC'], border: '#CFD6CE', title: '#3C5A50',
      phrase: '#17201D', sub: '#52605A', ornament: '#315F50',
    });
    expect(dailyPhraseChromeFor('sagePorcelain')).toEqual(DAILY_PHRASE_CHROME.sagePorcelain);
    expect(themedToastChrome('sagePorcelain', SAGE_PORCELAIN)).toMatchObject({
      cardColors: ['#FCFDF9', '#F0F1EC', '#E1E5DC'], accent: '#315F50', accentSoft: '#D9E9E1',
      border: '#CFD6CE', title: '#17201D', body: '#52605A',
    });
  });

  it('resolves Sage stats with approved semantic colors', () => {
    expect(statsPageField('sagePorcelain')).toBe('#F0F1EC');
    expect(statsThemeAccent('sagePorcelain')).toBe('#315F50');
    expect(statsSoftBg('sagePorcelain', 'streak', 'strong')).toBe('#315F502E');
    // стиль тоста медали для Sage теперь строится из токенов темы (таблица по режиму снята 28.10) — его читаемость проверяет tests/lessons_level_tokens_medal_toast_contract.test.ts
  });
});
