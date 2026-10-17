// зачем (координатор 12.10, подготовка к английскому интерфейсу; решение владельца 14.10 «en везде»): словари, где при lang=en раньше показывался русский или
// возвращался undefined, получили английский. Тест держит их содержимое и запрещает вернуть пул-приветствия без карты языков в сканере.
import fs from 'node:fs';
import path from 'node:path';

import { LESSON_NAMES_RU, lessonNamesForLang } from '../constants/lessons';
import { frameNameForLang, FRAMES } from '../constants/avatars';
import { pickReleaseNotesTexts } from '../components/release_notes_copy';
import { FONT_SIZE_LABELS } from '../components/ThemeContext';
import { CELEBRATION_FEATURES } from '../components/premium_celebration/celebrationContent';
import { ALL_SCENES, sceneText } from '../components/premium_celebration/celebrationScenes';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const hasCyrillic = (s: string) => /[а-яё]/i.test(s);

describe('English interface dictionaries (preparation, flag stays off)', () => {
  it('all 32 lesson names exist in English and none is Russian', () => {
    const en = lessonNamesForLang('en');
    expect(en).toHaveLength(LESSON_NAMES_RU.length);
    for (const name of en) {
      expect(name.trim().length).toBeGreaterThan(2);
      expect(hasCyrillic(name)).toBe(false);
    }
  });

  it('every avatar frame has an English name', () => {
    for (const frame of FRAMES) {
      const name = frameNameForLang(frame, 'en');
      expect(name).toBeTruthy();
      expect(hasCyrillic(name)).toBe(false);
    }
  });

  it('release notes in English are complete and not Russian', () => {
    const en = pickReleaseNotesTexts('en');
    const ru = pickReleaseNotesTexts('ru');
    expect(en).not.toBe(ru);
    expect(en.items).toHaveLength(ru.items.length);
    for (const text of [en.pill, en.title, en.subtitle, en.footer, en.cta, en.close, ...en.items.flatMap((i) => [i.title, i.body])]) {
      expect(hasCyrillic(text)).toBe(false);
    }
  });

  it('font size labels and Plus celebration texts have English', () => {
    for (const key of ['small', 'medium', 'large'] as const) expect(hasCyrillic(FONT_SIZE_LABELS[key].en)).toBe(false);
    for (const feature of CELEBRATION_FEATURES) {
      expect(hasCyrillic(feature.title.en)).toBe(false);
      if (feature.sub) expect(hasCyrillic(feature.sub.en)).toBe(false);
    }
    for (const scene of ALL_SCENES) {
      expect(hasCyrillic(sceneText(scene.title, 'en'))).toBe(false);
      expect(hasCyrillic(sceneText(scene.sub, 'en'))).toBe(false);
    }
  });

  it('the untranslated-UI scanner recognises per-language pools only when the file maps them by language', () => {
    const scanner = read('scripts/scan_untranslated_ui.mjs');
    expect(scanner).toContain('_(?:RU|UK))');
    expect(scanner).toMatch(/упомянуто как значение ru:\/uk:/);
    const home = read('app/(tabs)/home.tsx');
    expect(home).toMatch(/ru: GREETINGS_RU,/);
    expect(home).toMatch(/uk: GREETINGS_UK,/);
  });

  // зачем: владелец 17.10 «доведи до конца и открой английский» — флаг включён; сторож держит его включённым,
  // выключение — только новым словом владельца.
  it('the flag is on — owner 17.10: «доведи до конца и открой английский»', () => {
    expect(read('app/config.ts')).toMatch(/export const ENGLISH_UI_LOCALE_ENABLED = true;/);
  });
});

describe('untranslated-UI scanner knows the project\'s real translation shapes', () => {
  it('masks indented one-line locale maps, line-by-line locale entries and function-valued maps, but only with a neighbour language', () => {
    const scanner = fs.readFileSync(path.join(__dirname, '..', 'scripts/scan_untranslated_ui.mjs'), 'utf8');
    // зачем (Ядро 13.10, ночная регрессия): cca3a2602 добавил второй параметр (исходник для разбора тостов) — сторож проверяет
    // сам факт маскирования карт, а не число параметров.
    expect(scanner).toMatch(/function maskLocaleKeyedEntries\(source(?:, original = source)?\)/);
    expect(scanner).toMatch(/maskLocaleKeyedEntries\(src(?:, source)?\)/);
    expect(scanner).toContain(String.raw`const INLINE_LOCALE_MAP = /(^\s*|[{,]\s*)`);
    expect(scanner).toContain('OTHER_LOCALE_ENTRY');
    // одинокий ru:/uk: без соседей-языков остаётся нарушением
    expect(scanner).toMatch(/if \(!LOCALE_KEY_ENTRY\.test\(lines\[i\]\)\) continue;\s*let neighbour = false;/);
  });
});
