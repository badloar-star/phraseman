// зачем (ТЕМЫ 2.0, 2026-10-04): ThemedArt — заготовка под предметы 2.0 до прихода картинок.
// Сторожим: каждое из 110 имён ТЗ разрешается в обеих яркостях; пока нового файла нет —
// работает нынешняя картинка; повторное разрешение не создаёт новых объектов (ползунок и смена
// темы не пересоздают источники); generated-файл совпадает с папкой assets/images/v2art.
import fs from 'fs';
import path from 'path';
import {
  THEMED_ART_ALL_NAMES,
  THEMED_ART_NO_FALLBACK,
  resolveThemedArt,
  resolveThemedArtFrom,
} from '../app/theme/themed_art_registry';

const ROOT = path.join(__dirname, '..');

describe('themed art registry', () => {
  it('has exactly the 110 names from ASSETS_V2_PROMPTS.md', () => {
    expect(THEMED_ART_ALL_NAMES).toHaveLength(110);
    expect(new Set(THEMED_ART_ALL_NAMES).size).toBe(110);
    for (const n of ['lessons', 'today', 'mistakes_done', 'cards_from_video', 'course_map', 'league_diamond',
      'streak_10', 'streak_freeze_overlay', 'ach_special', 'prize_1y', 'shop', 'intro_mistake_practice', 'lesson_01', 'lesson_50']) {
      expect(THEMED_ART_ALL_NAMES).toContain(n);
    }
  });

  it('every name resolves in both brightnesses — new file, current picture, or an explicitly listed gap', () => {
    for (const name of THEMED_ART_ALL_NAMES) {
      for (const brightness of ['dark', 'light'] as const) {
        const art = resolveThemedArt(name, brightness);
        if (art.origin === 'none') {
          expect(THEMED_ART_NO_FALLBACK).toContain(name);
          expect(art.base).toBeNull();
        } else {
          expect(art.base).not.toBeNull();
        }
      }
    }
  });

  it('without new files the current picture is used and nothing is tinted', () => {
    const art = resolveThemedArtFrom({}, 'mistakes_entry', 'light');
    expect(art.origin).toBe('fallback');
    expect(art.base).not.toBeNull();
    expect(art.accent).toBeNull();
  });

  it('new file of the right brightness wins; the other brightness beats the old picture', () => {
    const own = resolveThemedArtFrom({ cards: { dark: 1, darkAccent: 2, light: 3, lightAccent: 4 } }, 'cards', 'light');
    expect(own).toMatchObject({ origin: 'v2art', base: 3, accent: 4 });
    const other = resolveThemedArtFrom({ cards: { dark: 1, darkAccent: 2 } }, 'cards', 'light');
    expect(other).toMatchObject({ origin: 'v2art_other_brightness', base: 1, accent: 2 });
  });

  it('resolving again returns the SAME object — theme/slider changes create no new sources', () => {
    for (const name of ['lessons', 'lesson_07', 'shop'] as const) {
      expect(resolveThemedArt(name, 'dark')).toBe(resolveThemedArt(name, 'dark'));
      expect(resolveThemedArt(name, 'light')).toBe(resolveThemedArt(name, 'light'));
    }
  });

  it('the generated file lists exactly the v2art files that exist', () => {
    const gen = fs.readFileSync(path.join(ROOT, 'app', 'theme', 'themed_art_assets.generated.ts'), 'utf8');
    const required = [...gen.matchAll(/require\('\.\.\/\.\.\/(assets\/images\/v2art\/[^']+)'\)/g)].map(m => m[1]!);
    for (const rel of required) expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    for (const brightness of ['dark', 'light']) {
      const dir = path.join(ROOT, 'assets', 'images', 'v2art', brightness);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        const m = file.match(/^([a-z0-9_]+)(\.accent)?\.webp$/);
        if (m && (THEMED_ART_ALL_NAMES as readonly string[]).includes(m[1]!)) {
          expect(required).toContain(`assets/images/v2art/${brightness}/${file}`);
        }
      }
    }
  });
});

describe('honest gaps', () => {
  it('places that show Ionicons today get NO borrowed picture (no level badges as lesson covers, no deleted intros)', () => {
    for (const n of ['today', 'mistakes_hero', 'intro_videos', 'lesson_07'] as const) {
      expect(resolveThemedArtFrom({}, n, 'dark').origin).toBe('none');
    }
  });
});
