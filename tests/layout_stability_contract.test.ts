/**
 * Контракт стабильности лэйаута: «первый кадр = финальная геометрия».
 *
 * зачем: владелец требует Bevel-уровень открытия экранов — контент НИКОГДА не
 * «дёргается» после первого кадра (модалка показалась и съехала, счётчик
 * прыгнул с нуля, баннер телепортировал экран вниз). Эти классы багов были
 * вычищены 2026-07-25; данный тест — храповик (ratchet), который фиксирует
 * вычищенное состояние и не даёт новым экранам молча вернуть проблему.
 *
 * Правила — AGENTS.md → «Performance Bible» → «Layout stability».
 * Baseline легаси-нарушителей: config/layout-stability-baseline.json —
 * он может ТОЛЬКО уменьшаться. Новое нарушение = красный CI: чините код,
 * а не baseline. Мгновенная подсветка при правке — PostToolUse-хук
 * scripts/hooks/layout_stability_hook.mjs (те же паттерны, тот же baseline).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'config', 'layout-stability-baseline.json');

type BaselineCounts = Record<string, number>;
interface LayoutStabilityBaseline {
  adjustsFontSizeToFit: BaselineCounts;
  rawSafeAreaInsets: BaselineCounts;
  loadingReturnsNull: BaselineCounts;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(relativeDir: string): string[] {
  const absoluteDir = path.join(ROOT, relativeDir);
  const result: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) result.push(...walk(relativePath));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) result.push(relativePath);
  }
  return result;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Вырезает многострочные /* ... *\/ комментарии целиком (не только их первую
 * строку) — иначе продолжение блочного комментария на второй+ строке (не
 * начинается с `*`/`//`) ошибочно считается кодом. Не задевает строки внутри
 * JSX/шаблонных строк на практике: проп adjustsFontSizeToFit никогда не несёт `/*`.
 */
function stripBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Счёт вхождений запрещённого JSX-пропа, комментарии не считаем.
 * Строки вида `adjustsFontSizeToFit:` (тип-литерал/деструктуризация с отбрасыванием,
 * `Omit<..., 'adjustsFontSizeToFit'>`) не считаем — это места, где проп ЗАПРЕЩАЮТ
 * принимать/прокидывать (эталон: components/text-integrity/FlowText.tsx), а не
 * места, где он реально применён к <Text>.
 */
function countAdjustsFontSizeToFit(source: string): number {
  let count = 0;
  for (const line of stripBlockComments(source).split('\n')) {
    if (isCommentLine(line)) continue;
    if (/adjustsFontSizeToFit\s*[:?]/.test(line)) continue;
    if (/['"]adjustsFontSizeToFit['"]/.test(line)) continue;
    const matches = line.match(/\badjustsFontSizeToFit\b/g);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Сырой useSafeAreaInsets из react-native-safe-area-context: до прихода
 * нативных метрик отдаёт 0 → контент прыгает. Разрешена только обёртка
 * useStableSafeAreaInsets (app/stable_safe_area_metrics.ts).
 */
const RAW_INSETS_IMPORT_RE =
  /import\s*\{[^}]*\buseSafeAreaInsets\b[^}]*\}\s*from\s*['"]react-native-safe-area-context['"]/g;

function countRawSafeAreaInsetsImports(source: string): number {
  return (source.match(RAW_INSETS_IMPORT_RE) || []).length;
}

/**
 * Экран, который на время загрузки отдаёт `return null` — это пустой кадр и
 * «впрыгивание» всего контента разом. Вместо этого — SkeletonBlock с финальной
 * геометрией или синхронная гидрация из peek-кэша.
 */
const LOADING_RETURNS_NULL_RE =
  /if\s*\(\s*[^)]{0,80}(?:[Ll]oading|[Pp]ending|[Bb]usy)[^)]{0,80}\)\s*\{?\s*return\s+null/g;

function countLoadingReturnsNull(source: string): number {
  return (source.match(LOADING_RETURNS_NULL_RE) || []).length;
}

function loadBaseline(): LayoutStabilityBaseline {
  const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as LayoutStabilityBaseline;
  expect(parsed).toHaveProperty('adjustsFontSizeToFit');
  expect(parsed).toHaveProperty('rawSafeAreaInsets');
  expect(parsed).toHaveProperty('loadingReturnsNull');
  return parsed;
}

function collectCounts(
  files: string[],
  counter: (source: string) => number,
): BaselineCounts {
  const counts: BaselineCounts = {};
  for (const file of files) {
    const count = counter(read(file));
    if (count > 0) counts[file] = count;
  }
  return counts;
}

/** Сравнение факта с baseline в обе стороны — храповик может только сжиматься. */
function expectRatchet(actual: BaselineCounts, baseline: BaselineCounts, hint: string): void {
  const files = new Set([...Object.keys(actual), ...Object.keys(baseline)]);
  const newViolations: string[] = [];
  const staleBaseline: string[] = [];
  for (const file of files) {
    const found = actual[file] || 0;
    const allowed = baseline[file] || 0;
    if (found > allowed) newViolations.push(`${file}: ${found} > baseline ${allowed}`);
    if (found < allowed) staleBaseline.push(`${file}: ${found} < baseline ${allowed}`);
  }
  expect({
    newViolations,
    hint: newViolations.length ? hint : 'ok',
  }).toEqual({ newViolations: [], hint: 'ok' });
  expect({
    staleBaseline,
    hint: staleBaseline.length
      ? 'Нарушение вычищено — осознанно уменьшите config/layout-stability-baseline.json.'
      : 'ok',
  }).toEqual({ staleBaseline: [], hint: 'ok' });
}

describe('layout stability contract (первый кадр = финальная геометрия)', () => {
  const baseline = loadBaseline();

  it('adjustsFontSizeToFit запрещён (ужимает короткие варианты на iOS) — только baseline-легаси', () => {
    const files = ['app', 'components'].flatMap(walk).filter((f) => f.endsWith('.tsx'));
    expectRatchet(
      collectCounts(files, countAdjustsFontSizeToFit),
      baseline.adjustsFontSizeToFit,
      'Новый adjustsFontSizeToFit запрещён: лечите переносом/вёрсткой, не сжатием шрифта (AGENTS.md → Layout stability).',
    );
  });

  it('сырой useSafeAreaInsets запрещён — только useStableSafeAreaInsets', () => {
    const files = ['app', 'components', 'hooks']
      .flatMap(walk)
      .filter((f) => f !== 'app/stable_safe_area_metrics.ts');
    expectRatchet(
      collectCounts(files, countRawSafeAreaInsetsImports),
      baseline.rawSafeAreaInsets,
      'Импортируйте useStableSafeAreaInsets из app/stable_safe_area_metrics — сырой хук отдаёт 0 до нативных метрик и контент прыгает.',
    );
  });

  it('экран не отдаёт return null на время загрузки — скелетон или peek-гидрация', () => {
    const files = walk('app').filter((f) => f.endsWith('.tsx'));
    expectRatchet(
      collectCounts(files, countLoadingReturnsNull),
      baseline.loadingReturnsNull,
      'if (loading) return null = пустой кадр и «впрыгивание» контента. Дайте SkeletonBlock с финальной геометрией.',
    );
  });

  /**
   * зачем: владелец потребовал, чтобы разделы открывались СТАТИЧНО — «всё сразу, ничего
   * не двигается и не шевелится». На этих экранах входные анимации (FadeInDown со
   * stagger'ом по индексу, «наливание» кольца прогресса от нуля) проигрывались на КАЖДОМ
   * открытии, даже когда данные уже готовы, и создавали ровно тот каскад съезжающих
   * блоков, который просили убрать (2026-07-26). Здесь фиксируем вычищенное состояние.
   */
  describe('перечисленные разделы открываются статично (без анимаций входа)', () => {
    const staticScreens = [
      'app/mistake_practice_session.tsx',
      'app/(tabs)/lessons.tsx',
      'app/flashcards_collection.tsx',
      'app/flashcards/FlashcardsCategoryHub.tsx',
    ];

    it.each(staticScreens)('%s не применяет entering-анимации', (file) => {
      const source = stripBlockComments(read(file));
      const applied = source
        .split('\n')
        .filter((line) => !isCommentLine(line))
        .filter((line) => /\bentering[=:]/.test(line));
      // Хаб карточек держит entering за выключенным флагом — код остаётся, но не
      // применяется; поэтому такие строки не считаем нарушением.
      const live = applied.filter((line) => !/FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED/.test(line));
      expect({ file, live }).toEqual({ file, live: [] });
    });

    it('кольцо прогресса главы рисуется сразу на финальном значении', () => {
      const source = read('app/(tabs)/lessons.tsx');
      expect(source).toContain('const fill = useSharedValue(clamped);');
      expect(stripBlockComments(source)).not.toContain('withDelay(');
    });

    it('флаг входной анимации хаба карточек выключен', () => {
      expect(read('app/flashcards/FlashcardsCategoryHub.tsx'))
        .toContain('const FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED = false;');
    });
  });

  describe('вставки в поток анимируются, а не телепортируют контент', () => {
    it('app/smooth_layout.ts существует и экспортирует animateNextLayoutTransition', () => {
      const source = read('app/smooth_layout.ts');
      expect(source).toContain('export function animateNextLayoutTransition');
      expect(source).toContain('LayoutAnimation.configureNext');
    });

    // зачем: эти баннеры стоят в потоке НАД стеком навигации (_layout) — их
    // мгновенное появление сдвигало вниз ВСЕ открытые экраны (аудит 2026-07-25).
    it.each([
      ['components/PromoBanner.tsx', 2],
      ['components/MaintenanceGate.tsx', 2],
    ])('%s оборачивает каждый flip видимости в animateNextLayoutTransition', (file, minCalls) => {
      const source = read(file);
      const calls = (source.match(/animateNextLayoutTransition\(/g) || []).length;
      expect({ file, calls, atLeast: minCalls }).toEqual({
        file,
        calls: expect.any(Number),
        atLeast: minCalls,
      });
      expect(calls).toBeGreaterThanOrEqual(minCalls);
    });

    it('OfflineBanner использует стабильные инсеты (overlay-эталон)', () => {
      const source = read('components/OfflineBanner.tsx');
      expect(source).toContain('useStableSafeAreaInsets');
      expect(source).toContain("position: 'absolute'");
    });
  });
});
