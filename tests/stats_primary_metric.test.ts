import {
  DEFAULT_STATS_PRIMARY_METRIC,
  STATS_PRIMARY_METRICS,
  isStatsPrimaryMetric,
  normalizeStatsPrimaryMetric,
} from '../app/stats_primary_metric';

describe('statistics primary metric preference', () => {
  it('keeps only XP, time, and the full year', () => {
    expect(STATS_PRIMARY_METRICS).toEqual(['xp', 'time', 'year']);
    expect(isStatsPrimaryMetric('xp')).toBe(true);
    expect(isStatsPrimaryMetric('time')).toBe(true);
    expect(isStatsPrimaryMetric('year')).toBe(true);
    expect(isStatsPrimaryMetric('activity')).toBe(false);
  });

  it('migrates all removed choices to XP', () => {
    expect(DEFAULT_STATS_PRIMARY_METRIC).toBe('xp');
    expect(normalizeStatsPrimaryMetric('activity')).toBe('xp');
    expect(normalizeStatsPrimaryMetric('rhythm')).toBe('xp');
    expect(normalizeStatsPrimaryMetric('learned')).toBe('xp');
  });
});

// зачем: контракт против регрессии "вспышки дефолтной вкладки" в «Активность
// за год» (Время/Опыт/Год). primaryMetric — module-private state в
// streak_stats.tsx (не отдельный модуль, как home_screen_hydration), поэтому
// проверяем контракт по исходнику: useState должен читать synchronous
// primaryMetricPeek лениво на первом кадре, а не стартовать с жёсткого
// DEFAULT_STATS_PRIMARY_METRIC с последующей асинхронной подменой
// (Perf Bible: instant first frame, no default-then-patch).
describe('streak stats "Активность за год" tab — no flash-then-snap on mount', () => {
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app/streak_stats.tsx'),
    'utf8',
  );

  it('lazily initializes useState from the synchronous peek, not a bare default', () => {
    expect(source).toContain(
      "const [primaryMetric, setPrimaryMetric] = useState<StatsPrimaryMetric>(() => primaryMetricPeek ?? DEFAULT_STATS_PRIMARY_METRIC);",
    );
    // Guards against reverting to the old bug: bare default with no lazy peek read.
    expect(source).not.toMatch(
      /useState<StatsPrimaryMetric>\(DEFAULT_STATS_PRIMARY_METRIC\)/,
    );
  });

  it('updates the module-level peek synchronously on tap, before AsyncStorage resolves', () => {
    expect(source).toMatch(/primaryMetricPeek = nextMetric;\s*\n\s*setPrimaryMetric\(nextMetric\);/);
  });

  it('updates the module-level peek from the async storage read too, so later mounts stay correct', () => {
    expect(source).toMatch(/const normalized = normalizeStatsPrimaryMetric\(stored\);\s*\n\s*primaryMetricPeek = normalized;/);
  });
});
