// зачем (координатор 12.10, аудит скорости R1): замер первого кадра и коммитов корня стоит на трёх экранах и в релизе не работает; лишний рендер Главной
// от новой идентичности токена аккаунта на монтировании закрыт сравнением по полям.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[PERF-R1] замер первого кадра', () => {
  const probe = read('app/perf_r1_probe.ts');
  it('в релизе и стор-сборке хук — пустая функция без React-хуков (тело горячего экрана остаётся чистым)', () => {
    expect(probe).toContain('const ENABLED = __DEV__ && !IS_STORE_RELEASE;');
    expect(probe).toContain('export const usePerfR1Probe: (screen: string) => void = ENABLED ? usePerfR1ProbeImpl : () => undefined;');
  });
  it('считает коммиты (не вызовы render) и пишет две строки на заход', () => {
    expect(probe).toContain("stage: 'first_frame'");
    expect(probe).toContain("stage: 'commits_3s'");
    expect(probe).toContain("stage: 'left_early'");
    expect(probe).toContain('useEffect(() => {\n    if (ENABLED && probeRef.current) probeRef.current.commits += 1;\n  });');
  });
  it('стоит в корне Главной, списка Уроков и хаба Карточек', () => {
    expect(read('app/(tabs)/home.tsx')).toContain("usePerfR1Probe('home');");
    expect(read('app/(tabs)/lessons.tsx')).toContain('usePerfR1Probe("lessons");');
    expect(read('app/flashcards/FlashcardsHubScreen.tsx')).toContain("usePerfR1Probe('cards_hub');");
  });
});

describe('Главная: нет лишнего рендера от новой идентичности токена аккаунта', () => {
  it('setMistakeAccountGeneration не меняет state, пока поколение, аккаунт и фаза те же', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('prev.generation === token.generation && prev.stableId === token.stableId && prev.phase === token.phase ? prev : token');
    expect(home).not.toMatch(/setMistakeAccountGeneration\(token\);/);
  });
});

describe('хаб Карточек: Intl-работа не на каждый рендер', () => {
  const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
  it('форматтер чисел и дата сброса считаются один раз на язык, словарная транскрипция — по слову', () => {
    expect(hub).toContain('const numberFormat = useMemo(() => new Intl.NumberFormat(lang), [lang]);');
    expect(hub).not.toContain('new Intl.NumberFormat(lang).format(n)');
    expect(hub).toContain('const resetDate = useMemo(() => {');
    expect(hub).toContain('}, [lang]);');
    expect(hub).toContain('const topDictIpa = useMemo(() => (topCardEn && !topStoredIpa ? getTranscription(topCardEn) : \'\'), [topCardEn, topStoredIpa]);');
  });
});

describe('[PERF-R1-MOUNT] / [PERF-R1-PROFILE]: трассировка двойного монтажа и чистого времени рендера (только dev)', () => {
  const probe = read('app/perf_r1_probe.ts');
  const layout = read('app/(tabs)/_layout.tsx');
  it('в релизе метка монтирования — пустая функция без хуков, а обёртка-замер отдаёт детей как есть', () => {
    expect(probe).toContain('export const useMountTrace: (tag: string, note?: string) => void = ENABLED ? useMountTraceImpl : () => undefined;');
    expect(probe).toContain('if (!ENABLED) return children;');
  });
  it('метка пишет render / mount / unmount с номером экземпляра, а сам замер Главной тоже помечен', () => {
    expect(probe).toContain("event: 'render'");
    expect(probe).toContain("event: 'mount'");
    expect(probe).toContain("event: 'unmount'");
    expect(probe).toContain('useMountTraceImpl(`probe:${screen}`);');
  });
  it('ярусы Главной помечены: tabs_layout → tab_scaffold → home_host, а Главная и Уроки обёрнуты в замер', () => {
    expect(layout).toContain("useMountTrace('tabs_layout');");
    expect(layout).toContain("useMountTrace('tab_scaffold');");
    expect(layout).toContain("useMountTrace('home_host');");
    expect(layout).toContain('<PerfR1Profile id="home">');
    expect(layout).toContain('<PerfR1Profile id="lessons">');
  });
});
