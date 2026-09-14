import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual Home block, without importing/rendering its native UI tree.
// Only storage, access resolution and UI sinks are doubled. JSON and array
// operations remain real; their counters prove work reduction, not launch time.
const source = fs.readFileSync(path.join(__dirname, '../app/(tabs)/home.tsx'), 'utf8');
const startMarker = '            let done = 0;';
const endMarker = "            step('lessons+unlockLoop');";
if (source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) {
  throw new Error('Home lesson block boundaries changed; review the runtime harness');
}
const block = source.slice(source.indexOf(startMarker), source.indexOf(endMarker));
const executable = ts.transpileModule(`
  module.exports = async function () {
    ${block}
    return { done, snapLastLessonId, snapLastLessonProgress, snapLastLessonScore };
  };
`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;

interface Summary {
  done: number;
  snapLastLessonId: number | null;
  snapLastLessonProgress: number;
  snapLastLessonScore: string;
}
interface LastLesson { id: number; name: string; progress: number; score: string }
interface Options {
  progress?: (string | null)[];
  lastId?: string | null;
  studyTarget?: string;
  mounted?: boolean;
  resolve?: (id: number, target: string) => Promise<number>;
  readError?: Error;
}
const completed = (count: number, status = 'correct'): string => JSON.stringify(Array(count).fill(status));
const progressKey = (id: number, target: string): string => `${target}:lesson${id}_progress`;
const lastKey = (target: string): string => `${target}:last_opened_lesson`;

function createRun(options: Options = {}) {
  const studyTarget = options.studyTarget ?? 'en';
  const store = new Map<string, string | null>(
    Array.from({ length: 32 }, (_, i) => [progressKey(i + 1, studyTarget), options.progress?.[i] ?? null]),
  );
  store.set(lastKey(studyTarget), options.lastId ?? null);
  const counts = { parses: 0, filters: 0 };
  const calls = {
    reads: [] as string[][],
    completed: [] as number[],
    last: [] as (LastLesson | null)[],
    warnings: [] as { scope: string; message: string; severity: string }[],
    resolved: [] as [number, string][],
    steps: [] as string[],
  };
  const resolve = async (id: number, target: string): Promise<number> => {
    calls.resolved.push([id, target]);
    return options.resolve ? options.resolve(id, target) : id;
  };
  const context = vm.createContext({
    counts,
    module: { exports: undefined },
    require: (name: string) => {
      if (name !== '../lesson_lock_system') throw new Error(`Unexpected import: ${name}`);
      return { resolveLastAvailableLessonId: resolve };
    },
    AsyncStorage: {
      multiGet: async (keys: string[]) => {
        calls.reads.push([...keys]);
        if (options.readError) throw options.readError;
        return keys.map((key) => [key, store.get(key) ?? null]);
      },
    },
    lessonProgressKey: progressKey,
    lastOpenedLessonKey: lastKey,
    studyTarget,
    lang: 'uk',
    lessonNamesForStudyTarget: (lang: string, target: string) =>
      Array.from({ length: 32 }, (_, i) => `${lang}:${target}:lesson${i + 1}`),
    mountedRef: { current: options.mounted ?? true },
    setLessonsCompleted: (value: number) => { calls.completed.push(value); },
    setLastLesson: (value: LastLesson | null) => { calls.last.push(value); },
    step: (value: string) => { calls.steps.push(value); },
    DebugLogger: {
      error: (scope: string, error: Error, severity: string) => {
        calls.warnings.push({ scope, message: error.message, severity });
      },
    },
  });
  vm.runInContext(`
    const originalParse = JSON.parse;
    JSON.parse = function (...args) { counts.parses++; return originalParse(...args); };
    const originalFilter = Array.prototype.filter;
    Array.prototype.filter = function (...args) {
      counts.filters++; return originalFilter.apply(this, args);
    };
    ${executable}
  `, context);
  return { calls, counts, store, run: context.module.exports as () => Promise<Summary> };
}

describe('Home lesson progress: same results without repeated processing', () => {
  it('parses each stored lesson only once, including the selected lesson', async () => {
    const run = createRun({ progress: Array(32).fill(completed(50)), lastId: '32' });
    expect(await run.run()).toEqual({ done: 32, snapLastLessonId: 32, snapLastLessonProgress: 50, snapLastLessonScore: '5.0' });
    expect(run.counts.parses).toBe(32);
  });

  it('counts correct answers without allocating filtered arrays', async () => {
    const run = createRun({ progress: Array(32).fill(completed(50)), lastId: '1' });
    await run.run();
    expect(run.counts.filters).toBe(0);
  });

  it.each([null, '', 'null', '{}', '42', 'true', '"correct"', '[]', '{broken'])
  ('keeps the selected lesson at zero for absent/invalid progress %p', async (raw) => {
    const run = createRun({ progress: [raw], lastId: '1' });
    expect(await run.run()).toEqual({ done: 0, snapLastLessonId: 1, snapLastLessonProgress: 0, snapLastLessonScore: '0.0' });
    expect(run.calls.last).toEqual([{ id: 1, name: 'uk:en:lesson1', progress: 0, score: '0.0' }]);
    expect(run.calls.warnings.map(({ scope, severity }) => ({ scope, severity })))
      .toEqual(raw === '{broken' ? [{ scope: 'home:correct', severity: 'warning' }] : []);
  });

  it('preserves the 45-answer threshold, replay answers, exact matching and scores above 50', async () => {
    const run = createRun({
      progress: [completed(44), completed(45, 'replay_correct'), completed(51),
        JSON.stringify(['correct', 'replay_correct', 'wrong', 'empty', null, ['correct'], { correct: true }, 'Correct', 'correct '])],
      lastId: '4',
    });
    expect(await run.run()).toEqual({ done: 2, snapLastLessonId: 4, snapLastLessonProgress: 2, snapLastLessonScore: '0.2' });
    run.store.set(lastKey('en'), '3');
    expect(await run.run()).toEqual({ done: 2, snapLastLessonId: 3, snapLastLessonProgress: 51, snapLastLessonScore: '5.1' });
  });

  it.each(['en', 'es'])('retains all lesson indices and one ordered storage batch for %s', async (studyTarget) => {
    for (let id = 1; id <= 32; id += 1) {
      const run = createRun({ studyTarget, progress: Array.from({ length: 32 }, (_, i) => completed(i + 1)), lastId: String(id) });
      expect(await run.run()).toEqual({ done: 0, snapLastLessonId: id, snapLastLessonProgress: id, snapLastLessonScore: (id / 50 * 5).toFixed(1) });
      expect(run.calls.reads).toEqual([[...Array.from({ length: 32 }, (_, i) => progressKey(i + 1, studyTarget)), lastKey(studyTarget)]]);
      expect(run.calls.resolved).toEqual([[id, studyTarget]]);
      expect(run.calls.last).toEqual([{ id, name: `uk:${studyTarget}:lesson${id}`, progress: id, score: (id / 50 * 5).toFixed(1) }]);
      expect(run.calls.steps).toEqual(['titles+achievements+greeting', 'titles+achievements']);
    }
  });

  it.each([null, '', '0', '-1', '33', 'NaN'])('keeps an invalid last id %p absent without calling the resolver', async (lastId) => {
    const run = createRun({ lastId });
    expect(await run.run()).toEqual({ done: 0, snapLastLessonId: null, snapLastLessonProgress: 0, snapLastLessonScore: '0.0' });
    expect(run.calls.last).toEqual([null]);
    expect(run.calls.resolved).toEqual([]);
    expect(run.counts.parses).toBe(0);
  });

  it('keeps completion before the resolver and last-lesson publication after it, using the same captured data', async () => {
    let release!: (id: number) => void;
    let entered!: () => void;
    const resolverEntered = new Promise<void>((resolve) => { entered = resolve; });
    const pendingId = new Promise<number>((resolve) => { release = resolve; });
    const run = createRun({ progress: [completed(45), completed(7)], lastId: '1', resolve: () => { entered(); return pendingId; } });
    const pending = run.run();
    await resolverEntered;
    expect(run.calls.completed).toEqual([1]);
    expect(run.calls.last).toEqual([]);
    run.store.set(progressKey(2, 'en'), completed(50));
    release(2);
    expect(await pending).toEqual({ done: 1, snapLastLessonId: 2, snapLastLessonProgress: 7, snapLastLessonScore: '0.7' });
    expect(run.calls.last).toEqual([{ id: 2, name: 'uk:en:lesson2', progress: 7, score: '0.7' }]);
    expect(run.calls.reads).toHaveLength(1);
  });

  it('preserves the selected lesson and warning when its resolver fails', async () => {
    const run = createRun({ progress: [completed(45)], lastId: '1', resolve: async () => { throw new Error('offline'); } });
    expect(await run.run()).toEqual({ done: 1, snapLastLessonId: 1, snapLastLessonProgress: 45, snapLastLessonScore: '4.5' });
    expect(run.calls.warnings).toEqual([{ scope: 'home:lastId', message: 'Error: offline', severity: 'warning' }]);
  });

  it('does not cache old progress between successive loads', async () => {
    const run = createRun({ progress: [completed(50)], lastId: '1' });
    await run.run();
    run.store.set(progressKey(1, 'en'), completed(4));
    expect(await run.run()).toEqual({ done: 0, snapLastLessonId: 1, snapLastLessonProgress: 4, snapLastLessonScore: '0.4' });
    expect(run.calls.completed).toEqual([1, 0]);
    expect(run.calls.reads).toHaveLength(2);
  });

  it('leaves storage failures to the existing outer loadData handler without publishing defaults', async () => {
    const error = new Error('storage unavailable');
    const run = createRun({ readError: error });
    await expect(run.run()).rejects.toBe(error);
    expect(run.calls.completed).toEqual([]);
    expect(run.calls.last).toEqual([]);
    expect(run.calls.resolved).toEqual([]);
  });

  it('preserves the existing mounted guards for absent last lessons', async () => {
    const run = createRun({ mounted: false });
    await run.run();
    expect(run.calls.completed).toEqual([]);
    expect(run.calls.last).toEqual([]);
  });
});
