import fs from 'node:fs';
import path from 'node:path';
import { buildMistakeDetail } from '../app/mistake_detail_model';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const DAY = 86_400_000;
const base = 1_700_000_000_000;

const captured = (id: string, atMs: number, facet = 'word_order', sourceKind = 'lesson_phrase'): MistakeEvent => ({
  eventId: `cap:${id}:${atMs}`,
  mistakeId: id,
  cycleId: `${id}:mistake-cycle:1`,
  type: 'captured',
  occurredAtMs: atMs,
  studyTarget: 'en',
  payload: {
    facet, sourceKind, sourceId: `src-${id}`, canonicalTarget: `Phrase ${id}`,
    sourceMeaning: `Фраза ${id}`, tokens: ['Phrase', id], distractors: ['x'], lessonId: '4',
    contentFingerprint: `fp-${id}`,
  },
});

const answered = (id: string, atMs: number, correct: boolean, mode: string, localDay: string): MistakeEvent => ({
  eventId: `ans:${id}:${atMs}`,
  mistakeId: id,
  cycleId: `${id}:mistake-cycle:1`,
  type: 'practice_answered',
  occurredAtMs: atMs,
  studyTarget: 'en',
  payload: { correct, independent: true, mode, localDay, exerciseId: `e-${atMs}`, sessionId: 's' },
});

// зачем (владелец 2026-09-14, макет карточки Б): хроника, остаток пути и
// похожие победы строятся ТОЛЬКО из журнала — ответ ученика там не хранится.
describe('mistake detail model', () => {
  test('builds a timeline from captures and answers, newest last', () => {
    const events = [
      captured('a', base),
      captured('a', base + DAY),
      answered('a', base + 2 * DAY, false, 'lesson_typing', '2026-09-03'),
      answered('a', base + 3 * DAY, true, 'lesson_typing', '2026-09-04'),
    ];
    const detail = buildMistakeDetail(events, 'a', base + 3 * DAY);
    expect(detail).not.toBeNull();
    expect(detail?.captureCount).toBe(2);
    expect(detail?.timeline.map((entry) => entry.kind)).toEqual([
      'captured', 'captured', 'practice_wrong', 'practice_right',
    ]);
    expect(detail?.timeline[0]?.sourceGroup).toBe('lessons');
    expect(detail?.qualifyingDays).toBe(1);
  });

  test('reports how many modes are already counted towards the fix', () => {
    const events = [
      captured('b', base),
      answered('b', base + DAY, true, 'lesson_typing', '2026-09-02'),
      answered('b', base + 2 * DAY, true, 'lesson_scripted_speech', '2026-09-03'),
    ];
    const detail = buildMistakeDetail(events, 'b', base + 2 * DAY);
    expect(detail?.qualifyingDays).toBe(2);
    expect(detail?.qualifyingModes).toBe(2);
    expect(detail?.status).toBe('active');
  });

  test('offers only already-fixed phrases of the same kind as neighbours', () => {
    const events = [
      captured('c', base, 'word_order'),
      captured('d', base, 'word_order'),
      answered('d', base + DAY, true, 'lesson_typing', '2026-09-02'),
      answered('d', base + 2 * DAY, true, 'lesson_scripted_speech', '2026-09-03'),
      answered('d', base + 3 * DAY, true, 'lesson_typing', '2026-09-04'),
      captured('e', base, 'pronunciation'),
    ];
    const detail = buildMistakeDetail(events, 'c', base + 3 * DAY);
    expect(detail?.solvedNeighbours.map((item) => item.phrase)).toEqual(['Phrase d']);
  });

  test('an unknown mistake returns nothing instead of an empty card', () => {
    expect(buildMistakeDetail([captured('a', base)], 'nope', base)).toBeNull();
  });

  test('screen is wired and never invents answers the journal does not store', () => {
    const screen = read('app/mistake_detail.tsx');
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="mistake_detail" />');
    expect(read('app/mistakes_list.tsx')).toContain("pathname: '/mistake_detail'");
    expect(screen).toContain('focusMistakeId: detail.mistakeId');
    expect(screen).toContain('SkeletonBlock');
    expect(screen).not.toMatch(/ActivityIndicator/);
    expect(screen).not.toMatch(/borderWidth|borderColor/);
    // Блок «твои ответы» из макета не строим: таких данных в журнале нет.
    expect(read('app/mistake_detail_model.ts')).toContain('журнал НЕ хранит ответ ученика');
  });
});
