/**
 * зачем: PM-193-A1 + PM-195-A1.
 * A1(193): у КАЖДОЙ записанной ошибки известны язык, контекст попытки и
 * ожидаемый ответ — со всех живых источников (уроки, слова, глаголы,
 * диагностика, экзамены, карточки, Learning V2, Шпиль).
 * A1(195): общая статистика («всего/исправлено/активно») считается по всему
 * журналу языка и не зависит от выбранного фильтра списка.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { MistakePracticeStorage } from '../app/mistake_practice_store';
import { captureObjectiveAttempt } from '../app/mistake_practice_capture';
import { loadMistakeEventJournal } from '../app/mistake_practice_store';
import { __resetAccountGenerationForTests } from '../app/account_generation';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { buildMistakePracticeHubSnapshot } from '../app/mistake_practice_insights';
import type { MistakeEvent, MistakeSourceKind } from '../modules/mistake-practice/contracts';

const read = (relative: string) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

function createStorage(): MistakePracticeStorage & { getAllKeys(): Promise<readonly string[]> } {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

const SOURCES: readonly MistakeSourceKind[] = [
  'lesson_phrase', 'lesson_word', 'irregular_verb', 'flashcard', 'diagnostic_test',
  'level_exam', 'exam', 'learning_v2',
];

describe('PM-193-A1: язык, контекст и ожидаемый ответ записываются со всех источников', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test.each(SOURCES)('%s (es): запись и чтение сохраняют язык, источник, контекст, ожидаемый ответ', async (kind) => {
    const storage = createStorage();
    const result = await captureObjectiveAttempt({
      accountScope: 'acc', attemptId: `a-${kind}`, studyTarget: 'es', verdict: 'wrong', objective: true,
      content: {
        sourceKind: kind, sourceId: `${kind}:1`, canonicalTarget: 'Estoy listo', sourceMeaning: 'Я готов',
        lessonId: '7', sourcePrompt: 'Yo ___ listo',
      },
      facet: { kind: 'form', expected: 'estoy', given: 'soy' },
    }, { storage });
    expect(result).toMatchObject({ kind: 'captured', appended: true });
    console.log('[PM-193-A1] источник', kind, '→', result.kind);

    const journal = await loadMistakeEventJournal({ accountScope: 'acc', studyTarget: 'es', storage });
    const item = [...projectMistakes(journal.events).items.values()][0];
    expect(item).toMatchObject({
      studyTarget: 'es', sourceKind: kind, sourceId: `${kind}:1`, lessonId: '7',
      canonicalTarget: 'Estoy listo', expected: 'estoy', given: 'soy', sourcePrompt: 'Yo ___ listo',
    });
  });

  // Все точки записи обязаны передавать язык + источник + ожидаемый ответ.
  test.each([
    'app/lesson1.tsx', 'app/lesson_words.tsx', 'app/lesson_irregular_verbs.tsx', 'app/diagnostic_test.tsx',
    'app/level_exam.tsx', 'app/exam.tsx', 'app/flashcards_swipe.tsx', 'app/flashcards_blitz_session.tsx',
    'app/flashcards_recall_session.tsx', 'app/flashcards_speaking_session.tsx',
    'app/learning-v2/session/[id].tsx', 'app/learning_v2_direct_session_player_v1.tsx', 'app/spire/spire_mistake_capture.ts',
  ])('%s: вызов записи несёт studyTarget, sourceKind, sourceId, canonicalTarget, expected', (relative) => {
    const source = read(relative);
    const at = source.search(/captu(re|reCurrentAccount)ObjectiveAttempt\(\{|captureObjectiveAttempt\(\{/);
    expect(at).toBeGreaterThan(-1);
    // Шпиль собирает content выше вызова (спред) — берём весь файл.
    const call = relative.startsWith('app/spire/') ? source : source.slice(at, at + 2600);
    for (const field of ['studyTarget', 'sourceKind', 'sourceId', 'canonicalTarget', 'expected']) {
      expect({ relative, field, present: call.includes(field) }).toEqual({ relative, field, present: true });
    }
  });

  test('старая запись без необязательных полей читается как раньше', () => {
    const legacy: MistakeEvent = {
      eventId: 'e1', mistakeId: 'm1', cycleId: 'c1', type: 'captured', occurredAtMs: 1, studyTarget: 'en',
      payload: { canonicalTarget: 'Hello', facet: 'meaning', sourceKind: 'lesson_word', sourceId: 'x' },
    };
    const item = projectMistakes([legacy]).items.get('m1');
    expect(item).toMatchObject({ studyTarget: 'en', expected: null, given: null, sourcePrompt: null, lessonId: null });
  });
});

describe('PM-195-A1: общая статистика не зависит от фильтра списка', () => {
  const T = Date.UTC(2026, 9, 1);
  const cap = (id: string, at: number): MistakeEvent => ({
    eventId: `cap-${id}`, mistakeId: id, cycleId: `cy-${id}`, type: 'captured', occurredAtMs: at, studyTarget: 'es',
    payload: { canonicalTarget: `Frase ${id}`, facet: 'form', sourceKind: 'lesson_phrase', sourceId: id },
  });
  const events: MistakeEvent[] = [
    cap('a', T - 1000), cap('b', T - 2000), cap('c', T + 10 * 86_400_000), // c — активна, но ещё не «готова»
    cap('d', T - 3000),
    { eventId: 'rw-d', mistakeId: 'd', cycleId: 'cy-d', type: 'correction_rewarded', occurredAtMs: T - 500, studyTarget: 'es', payload: {} },
  ];

  test('итоги считаются по всему журналу; вкладки списка — срезы тех же данных', () => {
    const snap = buildMistakePracticeHubSnapshot(events, T);
    const byFilter = (f: 'ready' | 'all' | 'corrected') => snap.items.filter((i) =>
      f === 'ready' ? i.ready : f === 'corrected' ? i.status === 'corrected' : i.status === 'active');
    console.log('[PM-195-A1] insights', JSON.stringify({ active: snap.insights.active, corrected: snap.insights.corrected, total: snap.insights.totalTracked }),
      'filters', byFilter('ready').length, byFilter('all').length, byFilter('corrected').length);
    expect(snap.insights.totalTracked).toBe(snap.items.length);
    expect(snap.insights.active).toBe(byFilter('all').length);
    expect(snap.insights.corrected).toBe(byFilter('corrected').length);
    expect(snap.readyCount).toBe(byFilter('ready').length);
    // Фильтр «Готовы» уже, чем итог, но итог не уменьшается.
    expect(byFilter('ready').length).toBeLessThan(byFilter('all').length);
    expect(snap.insights.active + snap.insights.corrected).toBe(snap.items.length);
  });

  test('экран списка: фильтр — только вид; снимок грузится без фильтра, счётчики вкладок идут по полному items', () => {
    const source = read('app/mistakes_list.tsx');
    expect(source).toContain('loadMistakePracticeHubSnapshot(target)');
    // зачем (PM-195, экран переделан по макету «Панель»): счётчик «Ждут» и вкладка считаются по ПОЛНОМУ items,
    // а фильтр группы — только срез поверх вкладки (visible = inTab.filter), на итоги не влияет.
    expect(source).toMatch(/const waitingCount = useMemo\(\(\) => \(items \?\? \[\]\)\.filter\(/);
    expect(source).toMatch(/const inTab = useMemo\(\(\) => \(items \?\? \[\]\)\.filter\(/);
    expect(source).toMatch(/const visible = useMemo\(\(\) => inTab\.filter\(/);
    // setItems получает полный snapshot.items, а не отфильтрованное.
    // зачем (11.10, аудит Optimistic UI п.2): из полного списка убираются только локально скрытые (запись журнала
    // ещё идёт) — фильтр группы по-прежнему не трогает items.
    expect(source).toContain('setItems(withoutLocallyHiddenMistakes(snapshot.items))');
  });
});
