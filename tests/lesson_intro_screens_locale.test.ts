/**
 * Экраны интро: минимум 3 слайда, titleES/textES; у примеров перевод для ES —
 * отдельный trES или fallback на trRU (как в типах и в UI).
 */
import fs from 'fs';
import path from 'path';
import { getLessonIntroScreens, LESSON_DATA } from '../app/lesson_data_all';
import { EXTRA_INTRO_SCREENS } from '../app/lesson_intro_screens_9_32';
import { LESSON_9_INTRO_SCREENS } from '../app/lesson_intro_screens_lesson9_v2';
import type { LessonIntroScreen } from '../app/lesson_data_types';

const ROOT = path.resolve(__dirname, '..');

function assertScreenSpanishComplete(screen: LessonIntroScreen, _lessonId: number, _index: number): void {
  expect(typeof screen.titleES).toBe('string');
  expect((screen.titleES as string).trim().length).toBeGreaterThan(0);
  expect(typeof screen.textES).toBe('string');
  expect((screen.textES as string).trim().length).toBeGreaterThan(0);
  const examples = screen.examples;
  if (!examples?.length) return;
  examples.forEach((ex) => {
    // trES опционален (см. LessonIntroExample); в UI для es — trES ?? trRU
    const tr = (ex.trES ?? ex.trRU) as string;
    expect(typeof tr).toBe('string');
    expect(tr.trim().length).toBeGreaterThan(0);
  });
}

describe('lesson intro screens (es locale fields)', () => {
  it('sanity: LESSON_DATA exposes intro screens length for lesson 1', () => {
    expect(LESSON_DATA[1]?.introScreens?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('getLessonIntroScreens(1) matches minimum intro depth', () => {
    expect(getLessonIntroScreens(1).length).toBeGreaterThanOrEqual(3);
  });

  it('EXTRA_INTRO_SCREENS covers 9–32 with non-empty arrays', () => {
    for (let lessonId = 9; lessonId <= 32; lessonId++) {
      const extra = EXTRA_INTRO_SCREENS[lessonId];
      expect(extra).toBeDefined();
      expect(extra!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('getLessonIntroScreens returns >= 3 slides and full ES fields for lessons 1–32', () => {
    for (let lessonId = 1; lessonId <= 32; lessonId++) {
      const screens = getLessonIntroScreens(lessonId);
      expect(screens.length).toBeGreaterThanOrEqual(3);
      screens.forEach((s, i) => assertScreenSpanishComplete(s, lessonId, i));
    }
  });

  it('keeps lesson 9 there is intro copy natural in RU/UK/PL', () => {
    const firstScreen = LESSON_9_INTRO_SCREENS[0];
    const text = [
      ...(firstScreen.linesRU ?? []),
      ...(firstScreen.linesUK ?? []),
      ...(firstScreen.linesPl ?? []),
    ]
      .flatMap((line) => line.parts ?? [])
      .map((part) => part.text)
      .join('\n');

    expect(text).not.toContain('Не так для');
    expect(text).not.toContain('Правильно для');
    expect(text).not.toContain('Nie tak dla');
    expect(text).not.toContain('Poprawnie dla');
    expect(text).toContain('Не переводим "есть проблема" как:');
    expect(text).toContain('Говорим так:');
  });

  it('keeps rich intro color semantics separate from background fills', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_intro_screens.tsx'), 'utf8');

    expect(source).toContain('const semanticLineBg');
    expect(source).toContain('styles.richLineStripe');
    expect(source).toContain('styles.exampleNote');
    expect(source).not.toContain("line.type === 'tip'\n              ? `${t.gold}14`");
    expect(source).not.toContain('color: t.gold, fontSize: f.caption');
  });

  it('keeps the absolute intro header below the top safe area', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_intro_screens.tsx'), 'utf8');

    expect(source).toContain('const introHeaderTop = insets.top + INTRO_HEADER_TOP_GAP;');
    expect(source).toContain('edges={[\'bottom\']}');
    expect(source).toContain('top: introHeaderTop');
    expect(source).toContain('paddingTop: introHeaderTop + INTRO_HEADER_SCROLL_OFFSET');
  });

  it('keeps the intro back button before the lesson badge in the header', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_intro_screens.tsx'), 'utf8');
    const headerStart = source.indexOf('<Animated.View', source.indexOf('Шапка: Back'));
    const headerEnd = source.indexOf('</Animated.View>', headerStart);
    const headerSource = source.slice(headerStart, headerEnd);

    expect(headerSource.indexOf('testID="lesson-intro-back"')).toBeGreaterThanOrEqual(0);
    expect(headerSource.indexOf('styles.headerPill')).toBeGreaterThanOrEqual(0);
    expect(headerSource.indexOf('testID="lesson-intro-back"')).toBeLessThan(headerSource.indexOf('styles.headerPill'));
  });

  it('does not route planned intro UI locales through RU/UK/ES runtime fallbacks', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_intro_screens.tsx'), 'utf8');
    const legacyRuntimeFallback = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimeFallback);
    expect(source).not.toMatch(/\{\s*ru:\s*(?:ex|screen|value|km)\./);
    expect(source).not.toMatch(/uk:\s*(?:ex|screen|value|km)\./);
    expect(source).not.toMatch(/es:\s*(?:ex|screen|value|km)\./);
    expect(source).toContain('type PlannedIntroLang');
    expect(source).toContain('defaultTitlePtBr');
    expect(source).toContain('isPlannedIntroLang(lang)');
  });
});
