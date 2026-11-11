import fs from 'node:fs';
import path from 'node:path';
import {
  lessonHelpRedirectReasonForHint,
  redirectHintToLessonHelp,
  theoryEntryRouteForTarget,
} from '../app/theory_entry_route';
import { theoryEntryFor } from '../constants/i18n';

const ROOT = path.join(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

describe('Theory redirect wiring', () => {
  it('uses one target-aware entry decision from the lesson menu', () => {
    const menu = read('app/lesson_menu.tsx');
    expect(menu).toContain('theoryEntryRouteForTarget');
  });

  it('delegates HintScreen redirects through the single replacement seam', () => {
    const hint = read('app/hint.tsx');
    expect(hint).toContain('redirectHintToLessonHelp');
  });
});

describe('Theory redirect behavior', () => {
  it('opens lesson help directly for a foreign study target but preserves English entry rules', () => {
    expect(theoryEntryRouteForTarget({ uiLang: 'ru', studyTarget: 'de', interactive: true, origin: 'lesson_menu' })).toBe('lesson_help');
    expect(theoryEntryRouteForTarget({ uiLang: 'en', studyTarget: 'fr', interactive: true, origin: 'lesson_menu' })).toBe('lesson_help');
    for (const uiLang of ['ru', 'en', 'pt-BR'] as const) {
      expect(theoryEntryRouteForTarget({ uiLang, studyTarget: 'en', interactive: true, origin: 'lesson_menu' }))
        .toBe(theoryEntryFor(uiLang, true, 'lesson_menu'));
    }
  });

  it('coalesces overlapping foreign-target and UI-locale redirects into one replacement', () => {
    const router = { replace: jest.fn() };
    expect(lessonHelpRedirectReasonForHint({ theoryEntry: 'hidden', studyTarget: 'de' })).toBe('foreign_target');
    expect(lessonHelpRedirectReasonForHint({ theoryEntry: 'hint', studyTarget: 'en' })).toBeNull();
    redirectHintToLessonHelp(router, 1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/lesson_help', params: { id: '1' } });
  });
});
