// ЗАМОК ВЛАДЕЛЬЦА 29.10 (жалоба №8, макет VCtfXrJuZn37rcsTvnLDMm одобрен через координатора): «хорошо, но это же кнопка "Не хочу с начала"
// — пусть так и называется, если это она». Сторож:
// - кнопка теста уровня называется «Не хочу с начала» (seasonText 'notFromStart'), отдельной подписи «Проверить уровень» нет;
// - на обложке кнопка не только у новичка: решение — learningV2PlacementEntryV1 (тест не использован и урок < 10);
// - тап по закрытой карте: вибрация и тряска замка, окна нет (замок 22.10), плашка «Откроется после занятия N» — 4 с с кнопкой, 2,2 с без;
// - события [PLACEMENT-ENTRY] проходят белый список журнала обращений.
import fs from 'fs';
import path from 'path';

const recorded: Array<Record<string, unknown>> = [];
jest.mock('../app/support_diagnostics', () => ({
  recordSupportDiagnostic: jest.fn(async (event: Record<string, unknown>) => { recorded.push(event); }),
}));

import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';
import {
  notePlacementEntryDecision,
  placementEntryAction,
  placementLockHintAction,
  placementTapAction,
  resetPlacementEntryDiagnosticsForTests,
} from '../app/learning_v2_placement_entry_diagnostics';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const SEASON = 'components/learning-v2/season';

beforeEach(() => {
  recorded.length = 0;
  resetPlacementEntryDiagnosticsForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 29.10: «Не хочу с начала» — вход в тест уровня', () => {
  test('кнопка называется «Не хочу с начала»; подписи «Проверить уровень» нет нигде в курсе', () => {
    const view = read(`${SEASON}/SeasonCourseView.tsx`);
    const course = read(`${SEASON}/SeasonCourse.tsx`);
    expect(view).toMatch(/testID="season-not-from-start"/);
    expect(view).toMatch(/seasonText\(lang, 'notFromStart'\)/);
    expect(course).toMatch(/buttonLabel=\{seasonText\(lang, 'notFromStart'\)\}/);
    for (const rel of [`${SEASON}/SeasonCourseView.tsx`, `${SEASON}/SeasonCourse.tsx`, `${SEASON}/SeasonLockHint.tsx`, 'app/learning_v2_placement_entry_copy.ts']) {
      expect(read(rel)).not.toMatch(/Проверить уровень'|'Check my level/);
    }
  });

  test('на обложке кнопка не только у новичка; показ решает learningV2PlacementEntryV1', () => {
    const view = read(`${SEASON}/SeasonCourseView.tsx`);
    expect(view).not.toMatch(/props\.newcomer && props\.onNotFromStart/);
    expect(view).toMatch(/\{props\.onNotFromStart \? \(/);
    // текст кнопки в одну строку: высота кнопки 50, ужимать шрифт запрещено (Переводчик 29.10)
    expect(view).toMatch(/style=\{styles\.glassText\} numberOfLines=\{1\}/);
    const connected = read(`${SEASON}/SeasonCourseConnected.tsx`);
    expect(connected).toMatch(/learningV2PlacementEntryV1\(\{ used: notFromStartUsed, currentLessonOrdinal: canonical/);
    expect(connected).toMatch(/const notFromStartAvailable = placementEntry\.show;/);
  });

  test('закрытая карта: вибрация, тряска, плашка; окна нет (замок 22.10)', () => {
    const course = read(`${SEASON}/SeasonCourse.tsx`);
    expect(course).toMatch(/if \(card && card\.state === 'locked'\) \{ shakeLocked\(index, 'carousel'\); return; \}/);
    expect(course).toMatch(/void hapticWarning\(\);/);
    expect(course).toMatch(/placementOpensAfterText\(lang, 'session', after\)/);
    expect(course).toMatch(/<SeasonLockHint/);
    const hint = read(`${SEASON}/SeasonLockHint.tsx`);
    expect(hint).not.toMatch(/\bModal\b/);
    expect(hint).toMatch(/SEASON_LOCK_HINT_WITH_BUTTON_MS = 4_000/);
    expect(hint).toMatch(/SEASON_LOCK_HINT_TEXT_ONLY_MS = 2_200/);
  });

  test('события [PLACEMENT-ENTRY] проходят белый список журнала; решение пишется один раз на смену', async () => {
    const actions = [
      placementEntryAction('cover', 'shown', 3), placementEntryAction('cover', 'beyond_cap', 12),
      placementEntryAction('cover', 'used_unknown', null), placementTapAction('cover'), placementTapAction('plaque'),
      placementLockHintAction(true, 9), placementLockHintAction(false, 56),
    ];
    for (const action of actions) {
      expect(sanitizeSupportDiagnosticEvent({ event: 'feature_action', action, atMs: 1 })?.action).toBe(action);
    }
    notePlacementEntryDecision('cover', 'shown', 3, 10);
    notePlacementEntryDecision('cover', 'shown', 3, 11);
    notePlacementEntryDecision('cover', 'used', 3, 12);
    await Promise.resolve();
    expect(recorded.map((e) => e.action)).toEqual(['placement:entry:cover:shown:l3', 'placement:entry:cover:used:l3']);
    expect(recorded[1]).toMatchObject({ result: 'blocked', screen: '/lessons' });
  });
});
