// зачем (координатор 04.10, кнопка «Ещё N» в итоге отработки, mistakes-panel.html кадр result):
// новая сессия только из ошибок, на которые ответили неверно. Без параметра — всё как раньше.
import fs from 'fs';
import path from 'path';
import type { MistakeProjectionItem } from '../modules/mistake-practice/projection';
import {
  buildMistakePracticeSession,
  MISTAKE_RETRY_IDS_MAX,
  parseMistakeRetryIdsParam,
} from '../modules/mistake-practice/session';

function item(index: number, status: MistakeProjectionItem['status'] = 'active'): MistakeProjectionItem {
  return {
    mistakeId: `mistake:v1:${String(index).padStart(4, '0')}`,
    cycleId: 'cycle-1',
    studyTarget: 'en',
    status,
    firstCapturedAtMs: index,
    lastEventAtMs: index,
    dueAtMs: 0,
    correctedAtMs: status === 'corrected' ? index : null,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    lessonId: '1',
    facet: 'meaning',
    canonicalTarget: `I am ready ${index}.`,
    sourceMeaning: `Я готов ${index}.`,
    tokens: ['I', 'am', 'ready'],
    distractors: ['are'],
  };
}

const ITEMS = [item(1), item(2), item(3), item(4), item(5, 'corrected'), item(6)];
const BASE = { items: ITEMS, requestedLength: 'all' as const, nowMs: 1_000 };
const ids = (session: ReturnType<typeof buildMistakePracticeSession>) => session.queue.map((entry) => entry.mistakeId);

describe('«Ещё N»: сужение сессии до неверных', () => {
  test('без параметра и с пустым списком — сессия прежняя байт в байт', () => {
    const plain = buildMistakePracticeSession(BASE);
    expect(buildMistakePracticeSession({ ...BASE, mistakeIds: undefined })).toEqual(plain);
    expect(buildMistakePracticeSession({ ...BASE, mistakeIds: [] })).toEqual(plain);
  });

  test('сужает до переданных id', () => {
    const retry = buildMistakePracticeSession({ ...BASE, mistakeIds: [ITEMS[1]!.mistakeId, ITEMS[3]!.mistakeId] });
    expect(ids(retry)).toEqual([ITEMS[1]!.mistakeId, ITEMS[3]!.mistakeId]);
  });

  test('id не из обычной отработки отбрасываются (исправленная ошибка)', () => {
    const active = buildMistakePracticeSession({ ...BASE, mistakeIds: [ITEMS[0]!.mistakeId, ITEMS[4]!.mistakeId] });
    expect(ids(active)).toEqual([ITEMS[0]!.mistakeId]);
  });

  test("с mistakeIds pool игнорируется: «Ещё N» после повтора исправленных берёт вернувшиеся в активные", () => {
    const afterReview = buildMistakePracticeSession({ ...BASE, pool: 'corrected', mistakeIds: [ITEMS[0]!.mistakeId, ITEMS[4]!.mistakeId] });
    expect(ids(afterReview)).toEqual([ITEMS[0]!.mistakeId]);
    expect(afterReview).not.toHaveProperty('pool');
    expect(afterReview).toEqual(buildMistakePracticeSession({ ...BASE, mistakeIds: [ITEMS[0]!.mistakeId, ITEMS[4]!.mistakeId] }));
  });

  test('ни одного готового — прежняя ошибка', () => {
    expect(() => buildMistakePracticeSession({ ...BASE, mistakeIds: ['mistake:v1:nope'] }))
      .toThrow('mistake_practice_no_ready_mistakes');
  });
});

describe('«Ещё N»: разбор параметра маршрута', () => {
  test('берёт допустимые id через запятую, без повторов', () => {
    expect(parseMistakeRetryIdsParam(' mistake:v1:a , mistake:v1:b,mistake:v1:a ,')).toEqual({ ids: ['mistake:v1:a', 'mistake:v1:b'], dropped: 0, overLimit: 0 });
  });

  test('мусор отбрасывается и считается', () => {
    const parsed = parseMistakeRetryIdsParam(['mistake:v1:a', '<script>', 'x y', 'a/b', 'z'.repeat(200)].join(','));
    expect(parsed.ids).toEqual(['mistake:v1:a']);
    expect(parsed.dropped).toBe(4);
  });

  test(`не больше ${MISTAKE_RETRY_IDS_MAX} id`, () => {
    const many = Array.from({ length: 45 }, (_, i) => `mistake:v1:${i}`).join(',');
    const parsed = parseMistakeRetryIdsParam(many);
    expect(parsed.ids).toHaveLength(MISTAKE_RETRY_IDS_MAX);
    expect(parsed.overLimit).toBe(15);
  });

  test('массив параметров expo-router и пустое значение', () => {
    expect(parseMistakeRetryIdsParam(['mistake:v1:a', 'mistake:v1:b']).ids).toEqual(['mistake:v1:a', 'mistake:v1:b']);
    expect(parseMistakeRetryIdsParam(undefined)).toEqual({ ids: [], dropped: 0, overLimit: 0 });
    expect(parseMistakeRetryIdsParam(42)).toEqual({ ids: [], dropped: 0, overLimit: 0 });
  });

  test('экран передаёт разобранные id в подготовку и пишет [MISTAKE-RETRY]; подготовка не продолжает старую сессию вместо «Ещё N»', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');
    expect(screen).toContain('mistakeIds: retryIds.ids,');
    expect(screen).toContain("'[MISTAKE-RETRY] route'");
    const runtime = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session_runtime.ts'), 'utf8');
    expect(runtime).toContain('const restoredStillAvailable = !retryRequested &&');
    expect(runtime).toContain("'[MISTAKE-RETRY] prepare'");
    expect(runtime).toContain('mistakeIds: input.mistakeIds,');
  });
});
