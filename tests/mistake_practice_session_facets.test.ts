// зачем (макет «Панель», окно «Перед отработкой»: чипы Значение / Грамматика / Произношение; координатор 04.10):
// необязательный параметр facets сужает НОВУЮ сессию до выбранных типов, а без него поведение прежнее байт в байт.
import { facetsFromParam, facetsOfGroup, mistakeGroupOf } from '../components/mistakes-panel/mistakeGroups';
import type { MistakeProjectionItem } from '../modules/mistake-practice/projection';
import { buildMistakePracticeSession } from '../modules/mistake-practice/session';

function item(index: number, facet: MistakeProjectionItem['facet']): MistakeProjectionItem {
  return {
    mistakeId: `mistake-${index}`,
    cycleId: 'cycle-1',
    studyTarget: 'en',
    status: 'active',
    firstCapturedAtMs: index,
    lastEventAtMs: index,
    dueAtMs: 0,
    correctedAtMs: null,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    lessonId: '1',
    facet,
    canonicalTarget: `I am ready ${index}.`,
    sourceMeaning: `Я готов ${index}.`,
    tokens: ['I', 'am', 'ready'],
    distractors: ['are'],
  };
}

const ITEMS = [item(1, 'word_order'), item(2, 'meaning'), item(3, 'missing_token'), item(4, 'meaning'), item(5, 'form')];
const BASE = { items: ITEMS, requestedLength: 'all' as const, nowMs: 1_000 };

describe('mistake practice session facets', () => {
  test('without facets the session is identical to the previous behaviour (undefined and empty list)', () => {
    const plain = buildMistakePracticeSession(BASE);
    expect(buildMistakePracticeSession({ ...BASE, facets: undefined })).toEqual(plain);
    expect(buildMistakePracticeSession({ ...BASE, facets: [] })).toEqual(plain);
    expect(plain.initialCount).toBe(5);
  });

  test('facets narrow the queue to the chosen types only', () => {
    const meaning = buildMistakePracticeSession({ ...BASE, facets: ['meaning'] });
    expect(meaning.queue.map((entry) => entry.facet)).toEqual(['meaning', 'meaning']);
    const grammar = buildMistakePracticeSession({ ...BASE, facets: facetsOfGroup('grammar') });
    expect(grammar.queue.map((entry) => entry.mistakeId).sort()).toEqual(['mistake-1', 'mistake-3', 'mistake-5']);
  });

  test('a type with no ready mistakes fails the same way as an empty journal (the chip must be inactive)', () => {
    expect(() => buildMistakePracticeSession({ ...BASE, facets: ['pronunciation'] })).toThrow('mistake_practice_no_ready_mistakes');
  });

  test('the three mockup groups cover every facet exactly once', () => {
    const all = ['meaning', 'form', 'word_order', 'missing_token', 'listening', 'pronunciation'] as const;
    for (const facet of all) {
      const group = mistakeGroupOf(facet);
      expect(facetsOfGroup(group)).toContain(facet);
    }
    const total = (['meaning', 'grammar', 'sound'] as const).reduce((sum, group) => sum + facetsOfGroup(group).length, 0);
    expect(total).toBe(all.length);
  });

  test('the route parameter maps to facets and anything unknown means no narrowing', () => {
    expect(facetsFromParam('sound')).toEqual(['pronunciation', 'listening']);
    expect(facetsFromParam(['meaning'])).toEqual(['meaning']);
    expect(facetsFromParam('all')).toBeUndefined();
    expect(facetsFromParam(undefined)).toBeUndefined();
  });
});
