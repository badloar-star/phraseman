// Замок формата событий журнала обращений для жалоб #1/#3/#11: действие обязано пройти белый список сервера
// (^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$, без «слова» из 20+ знаков), и показ списка пишется одним событием на смену итога.
const recorded: Array<Record<string, unknown>> = [];
jest.mock('../app/support_diagnostics', () => ({
  recordSupportDiagnostic: jest.fn(async (event: Record<string, unknown>) => { recorded.push(event); }),
}));

import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';
import {
  classicLessonsShownAction,
  featureIntroAction,
  noteClassicLessonsShown,
  resetLessonsAccessDiagnosticsForTests,
  v2SessionUnavailableAction,
} from '../app/lessons_access_diagnostics';

const passes = (action: string) => sanitizeSupportDiagnosticEvent({ event: 'feature_action', action, atMs: 1 })?.action === action;

beforeEach(() => {
  recorded.length = 0;
  resetLessonsAccessDiagnosticsForTests();
});

test('every action shape passes the support diagnostics whitelist', () => {
  const actions = [
    classicLessonsShownAction({ cutBy: 'none', queryActive: false, shownLessons: 32, unlocked: 12, done: 5, isPremium: true }),
    classicLessonsShownAction({ cutBy: 'list_not_built', queryActive: true, shownLessons: 0, unlocked: 0, done: 0, isPremium: false }),
    featureIntroAction('legacy_lessons_first_visit', 'ignored_inactive'),
    featureIntroAction('legacy_lessons_first_visit', 'open'),
    v2SessionUnavailableAction('en', 32, 56),
  ];
  expect(actions).toEqual([
    'classic:shown:none:s32:u12:d5:p1',
    'classic:shown:list_not_built:q:u0:d0:p0',
    'intro:legacy_lessons_first_visit:ignored_inactive',
    'intro:legacy_lessons_first_visit:open',
    'v2session:none:en:l32s56',
  ]);
  for (const action of actions) expect(passes(action)).toBe(true);
});

test('the classic list is recorded once per outcome, not per render or per search letter', () => {
  const base = { cutBy: 'none' as const, queryActive: false, shownLessons: 32, unlocked: 3, done: 1, isPremium: false };
  noteClassicLessonsShown(base);
  noteClassicLessonsShown(base);
  noteClassicLessonsShown({ ...base, queryActive: true, shownLessons: 5 });
  noteClassicLessonsShown({ ...base, queryActive: true, shownLessons: 2 });
  noteClassicLessonsShown({ ...base, cutBy: 'search', queryActive: true, shownLessons: 0 });
  expect(recorded.map((event) => event.action)).toEqual([
    'classic:shown:none:s32:u3:d1:p0',
    'classic:shown:none:q:u3:d1:p0',
    'classic:shown:search:q:u3:d1:p0',
  ]);
  expect(recorded.map((event) => event.result)).toEqual(['info', 'info', 'blocked']);
});

test('lesson menu lock and bounce actions pass the whitelist', () => {
  const { lessonMenuLockAction, lessonMenuBounceAction } = jest.requireActual('../app/lessons_access_diagnostics');
  const actions = [lessonMenuLockAction('premium_course', 7, true, 'available'), lessonMenuLockAction('error_fail_closed', 32, false, null), lessonMenuBounceAction(7, 'suppressed', 'back')];
  expect(actions).toEqual(['lessonlock:premium_course:l7:p1:g_available', 'lessonlock:error_fail_closed:l32:p0:g_none', 'lessonlock:bounce:suppressed:back:l7']);
  for (const action of actions) expect(passes(action)).toBe(true);
});
