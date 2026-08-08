import { runFactoryDepartment, FACTORY_DROPOFF_RATIO, FACTORY_MIN_SAMPLES } from './factory_department';
import type { ContentLessonRow, FetchContentSourceResult } from './content_firestore_fetcher';

const NOW = 1_800_000_000_000;

function row(lessonId: number, sampleCount: number, target: 'en' | 'fr' = 'en'): ContentLessonRow {
  return { lessonId, target, averageScore: 80, sampleCount };
}

function fetch(rows: readonly ContentLessonRow[], over: Partial<FetchContentSourceResult> = {}): FetchContentSourceResult {
  return {
    sourceId: 'lesson_stats', state: 'ready', truncated: false,
    droppedCount: 0, rows, observedAtMs: NOW, ...over,
  };
}

function run(rows: readonly ContentLessonRow[], trigger: 'scheduled' | 'owner_request' = 'scheduled', over = {}) {
  return runFactoryDepartment({ fetches: [fetch(rows, over)], trigger, nowMs: NOW });
}

describe('Jarvis content factory — where the path runs out, not where a lesson is broken', () => {
  test('stays silent when learners flow through evenly', () => {
    const rows = [row(1, 100), row(2, 95), row(3, 92), row(4, 90)];
    expect(run(rows).decisions).toHaveLength(0);
  });

  test('always answers the owner on request', () => {
    const { decisions } = run([row(1, 100), row(2, 95)], 'owner_request');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].department).toBe('factory');
  });

  test('finds the lesson where learners fall off a cliff', () => {
    // 100 → 20 на третьем уроке: путь обрывается именно там.
    const rows = [row(1, 100), row(2, 98), row(3, 20), row(4, 18)];
    const { decisions } = run(rows);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toContain('3');
  });

  test('reports the highest completed lesson without claiming the course ends there', () => {
    // lesson_stats is written only by lesson_complete, so the highest row cannot prove the catalog ends there.
    const rows = [row(1, 100), row(2, 99), row(3, 98)];
    const { decisions } = run(rows, 'owner_request');
    expect(decisions[0].finding).toMatch(/заверш|прошёл|completion/i);
    expect(JSON.stringify(decisions[0])).not.toMatch(/написать следующий урок/i);
  });

  test('ignores a drop on lessons too small to judge', () => {
    // 5 → 1 это не обрыв пути, а шум выборки.
    const rows = [row(1, FACTORY_MIN_SAMPLES - 1), row(2, 1)];
    expect(run(rows).decisions).toHaveLength(0);
  });

  test('each language is measured on its own, never mixed', () => {
    // Английский ровный, французский обрывается — смешав, обрыв бы потерялся.
    const rows = [
      row(1, 100, 'en'), row(2, 96, 'en'), row(3, 94, 'en'),
      row(1, 100, 'fr'), row(2, 90, 'fr'), row(3, 12, 'fr'),
    ];
    const { decisions } = run(rows);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/фр|fr/i);
  });

  test('reports a gap as no completion record, not a missing course lesson', () => {
    // A learner may not have completed lesson 3 even when it exists.
    const rows = [row(1, 100), row(2, 95), row(4, 90)];
    const { decisions } = run(rows, 'owner_request');
    expect(decisions[0].finding).toMatch(/заверш|прохожд|completion/i);
    expect(JSON.stringify(decisions[0])).not.toMatch(/недостающий урок/i);
  });

  test('no completion stats are insufficient to infer a missing lesson or request a new one', () => {
    const { decisions } = run([], 'owner_request');
    expect(decisions[0].finding).toMatch(/заверш|прохожд|completion/i);
    expect(JSON.stringify(decisions[0])).not.toMatch(/написать следующий урок|недостающий урок/i);
  });

  test('an unreadable source is reported as unreadable, never as complete', () => {
    const { decisions } = run([], 'scheduled', { state: 'error' });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/не удалось|недоступ/i);
    expect(decisions[0].evidence.every((e) => !e.trustworthy)).toBe(true);
  });

  test('stale completion statistics cannot support a current factory conclusion', () => {
    const { decisions } = run([row(1, 100), row(2, 10)], 'scheduled', { state: 'stale', observedAtMs: 1 });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].status).toBe('insufficient_evidence');
  });

  test('only observes — it must never propose generating lessons automatically', () => {
    const rows = [row(1, 100), row(2, 10)];
    const { decisions } = run(rows, 'owner_request');
    expect(decisions[0].mode).toBe('observe');
    expect(JSON.stringify(decisions[0].options)).not.toMatch(/автоматическ|сгенерир/i);
  });

  test('the drop-off ratio is a real cliff, not ordinary attrition', () => {
    expect(FACTORY_DROPOFF_RATIO).toBeLessThanOrEqual(0.6);
  });
});
