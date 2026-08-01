import fs from 'fs';
import path from 'path';
import { SETTINGS_SURFACES } from '../components/settings/settingsSurfaces';
import { DAILY_PHRASE_CHROME, dailyPhraseChromeFor } from '../app/daily_phrase_chrome';
import { themedToastChrome } from '../constants/themedToastChrome';
import { themedWeekDot } from '../constants/weekDotTheme';
import { statsPageField, statsSoftBg, statsThemeAccent } from '../constants/statsThemeChrome';
import { getMedalToastThemeStyle } from '../components/medalToastThemeStyles';
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
      ['components/settings/settingsSurfaces.ts', 'midnight'],
      ['app/(tabs)/settings.tsx', 'midnight'],
      ['app/daily_phrase_chrome.ts', 'midnight'],
      ['constants/themedToastChrome.ts', 'midnight'],
      ['constants/weekDotTheme.ts', 'midnight'],
      ['constants/statsThemeChrome.ts', 'midnight'],
      ['components/medalToastThemeStyles.ts', 'midnight'],
    ];

    for (const [file, nextTheme] of sources) {
      const entry = sourceEntry(file, nextTheme);
      expect(entry).not.toMatch(/as any|Partial|businessLight/);
      expect(entry).not.toMatch(/#(?:000000|0A0A0A)/i);
    }
  });

  it('uses the approved page, panel, border, text, and accent roles in both settings maps', () => {
    expect(SETTINGS_SURFACES.sagePorcelain).toEqual({
      panel: '#FCFDF9', chip: '#FCFDF9', border: '#CFD6CE', divider: '#CFD6CE',
      notice: '#E1E5DC', accent: '#315F50', chipOn: '#D1D9D1',
    });
    const local = sourceEntry('app/(tabs)/settings.tsx', 'midnight');
    for (const color of ['#FCFDF9', '#CFD6CE', '#E1E5DC', '#D1D9D1', '#315F50']) expect(local).toContain(color);
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

  it('resolves Sage week dots, stats, and medal rewards with approved semantic colors', () => {
    expect(themedWeekDot('sagePorcelain', SAGE_PORCELAIN)).toMatchObject({
      completeBg: '#2F6F4F', emptyBg: '#E1E5DC', todayBg: '#D9E9E1',
      emptyBorder: '#CFD6CE', todayBorder: '#315F50', checkColor: '#FFFFFF',
    });
    expect(statsPageField('sagePorcelain')).toBe('#F0F1EC');
    expect(statsThemeAccent('sagePorcelain')).toBe('#315F50');
    expect(statsSoftBg('sagePorcelain', 'streak', 'strong')).toBe('#315F502E');
    expect(getMedalToastThemeStyle('sagePorcelain')).toMatchObject({
      cardBgColors: ['#FCFDF9', '#E1E5DC'], borderColor: '#CFD6CE', titleColor: '#17201D',
      subtitleColor: '#52605A', surfaceAccent: '#315F50', medalPlateBg: '#D9E9E1',
    });
  });
});
