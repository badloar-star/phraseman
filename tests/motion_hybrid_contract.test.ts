import fs from 'fs';
import path from 'path';

/**
 * Контракт движения «Световод + Чекан» (см. AGENTS.md → «Motion Hybrid — правила-дефолты»).
 *
 * зачем: владелец утвердил гибридное движение как стандарт для ВСЕХ новых поверхностей.
 * Этот тест — храповик: новая модалка/тост/шит/баннер обязана идти через гибрид
 * (prop motionVariant или общие шеллы), кнопки-действия — через пресс-стандарт
 * (никакого плоского `opacity: pressed`), в UI — никаких эмодзи. Существующие
 * файлы без гибрид-точки перечислены в config/motion-hybrid-baseline.json —
 * список может только уменьшаться. Ослаблять контракт — только осознанно,
 * вместе с обновлением AGENTS.md.
 */

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'config', 'motion-hybrid-baseline.json');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(node_modules|__tests__|\.claude|\.worktrees|motion_showcase|dev)$/.test(entry.name)) walk(full, out);
    } else if (entry.isFile() && /\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join('/');

const MODAL_LIKE = /(Modal|Toast|Sheet|Banner|Celebration|Prompt)\w*\.tsx$/;
// зачем (координатор 05.10): гейт владельца 04.10 (CLAUDE.md, «анимации в точности как на макетах») новее этого
// правила (15.08). Движение кита 2.0 — словарь KIT_MOTION в constants/motionHybrid (только числа kit.css) — такой же
// законный вход, как гибрид. Это вход по содержимому, а не исключение по имени файла. KitSheetModal — общая
// шторка кита на KIT_MOTION (как HybridSheetShell для гибрида).
// зачем (Дизайн 12.10): FriendsAddSheetShell — общая шторка на KIT_MOTION (словарь кита), её потребители (StudyLanguageSheet и др.) входят через гибрид.
// зачем (закон владельца 22.10 «назад/✕ в одном месте», Ревизор 22.10): шапка шторки SectionSheetHeader больше не рисует свой ✕ на
// PressableHybrid — ✕ это общий ScreenCloseButton, а он сам нажимается через PressableHybrid (BackButton). Вход по содержимому тот же,
// что был у прежнего импорта гибрида в этой шапке; сама шторка (её движение) — у владельца окна.
// зачем (4 · Темы 28.10, по просьбе координатора; красный контракт на PaywallMSheet): PaywallSwipeSheet — общая шторка пейвола на KIT_MOTION и Reanimated (вход шторки, жест вниз, возврат пружиной —
// как HybridSheetShell / KitSheetModal); PaywallMSheet целиком лежит в ней и своих окон/анимаций не заводит. Вход по содержимому, а не исключение по имени файла.
const HYBRID_ENTRY = /motionVariant|HybridAlertShell|HybridSheetShell|FullscreenHybridEntrance|useRewardImpactHybrid|MotionModal|KIT_MOTION|KitSheetModal|FriendsAddSheetShell|PaywallSwipeSheet|<ScreenCloseButton\b/;

function hasHybridEntry(file: string): boolean {
  return /Hybrid\w*\.tsx$/.test(path.basename(file))
    || /import\s+\w*Hybrid\b/.test(fs.readFileSync(file, 'utf8'))
    || HYBRID_ENTRY.test(fs.readFileSync(file, 'utf8'));
}

/** Кнопки-действия без вдавливания: плоское затемнение вместо клавиши. */
const FLAT_PRESS = /opacity:\s*pressed\s*\?/;

/** Эмодзи в исходнике UI (комментарии вырезаются перед проверкой). */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{23F3}]/u;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function extractBalancedCalls(source: string, callee: string): string[] {
  const calls: string[] = [];
  const escaped = callee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const open = source.indexOf('(', match.index);
    let depth = 1;
    let quote: string | null = null;
    let escapedChar = false;
    for (let index = open + 1; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (escapedChar) escapedChar = false;
        else if (char === '\\') escapedChar = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === '`') quote = char;
      else if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          calls.push(source.slice(open + 1, index));
          break;
        }
      }
    }
  }
  return calls;
}

function splitTopLevelArguments(source: string): string[] {
  const args: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote: string | null = null;
  let escapedChar = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escapedChar) escapedChar = false;
      else if (char === '\\') escapedChar = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '(') round += 1;
    else if (char === ')') round -= 1;
    else if (char === '[') square += 1;
    else if (char === ']') square -= 1;
    else if (char === '{') curly += 1;
    else if (char === '}') curly -= 1;
    else if (char === ',' && round === 0 && square === 0 && curly === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(source.slice(start).trim());
  return args;
}

function surveyMotionViolations(source: string): string[] {
  const violations: string[] = [];
  for (const callee of ['Animated.timing', 'withTiming']) {
    for (const call of extractBalancedCalls(source, callee)) {
      if (/\bduration\s*:\s*-?\d+(?:\.\d+)?\b/.test(call)) violations.push(`${callee}:numeric-duration`);
    }
  }
  for (const call of extractBalancedCalls(source, 'withDelay')) {
    const [delay] = splitTopLevelArguments(call);
    if (/^-?\d+(?:\.\d+)?$/.test(delay)) violations.push('withDelay:numeric-delay');
  }
  for (const call of extractBalancedCalls(source, 'withSpring')) {
    const [, config = ''] = splitTopLevelArguments(call);
    if (/\b(?:mass|damping|stiffness|restDisplacementThreshold|restSpeedThreshold)\s*:\s*-?\d+(?:\.\d+)?\b/.test(config)) {
      violations.push('withSpring:inline-numeric-config');
    }
  }
  return violations;
}

/**
 * Не поверхности, а содержимое: файл сам ничего не показывает и не двигает — его рисует родительская
 * шторка/экран, а под MODAL_LIKE он попал только по имени. Каждая запись — с причиной (координатор 05.10).
 */
const NOT_A_SURFACE: Readonly<Record<string, string>> = {
  'components/profile-card/ProfileCardBioSheet.tsx': 'содержимое шторки «О себе» визитки: без Modal и анимаций, показывает родитель визитки',
  'components/profile-card/ProfileCardProSheet.tsx': 'содержимое шторки Plus визитки: без Modal и анимаций, показывает родитель визитки',
  'components/paywall/PaywallTrialReminderPrompt.tsx': 'встроенный блок экрана оплаты (напоминание о пробном периоде), не окно и не шторка',
  'components/home/HomeSheetTextGuard.tsx': 'предохранитель-обёртка (error boundary) вокруг содержимого шторок Главной: без Modal и анимаций, только журнал [TEXT-OUTSIDE]',
  'components/ResponsiveModalScrollView.tsx': 'обёртка прокрутки содержимого окон, сама не окно и не двигается',
};

describe('motion hybrid contract', () => {
  const files = [...walk(path.join(ROOT, 'components')), ...walk(path.join(ROOT, 'app'))];
  const modalLike = files.filter((f) => MODAL_LIKE.test(path.basename(f)) && !(rel(f) in NOT_A_SURFACE));
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    legacyModalFiles: string[];
    /** Без своего движения в макете / под запретом владельца / передано другой сессии — путь → причина. */
    awaiting?: Record<string, string>;
  };
  const awaiting = baseline.awaiting ?? {};
  // зачем (координатор 05.10): «ждущие» — не долг храповика, а объяснённые исключения; храповик legacy не трогаем.
  const legacySet = new Set([...baseline.legacyModalFiles, ...Object.keys(awaiting)]);

  it('every explained exception still exists, has a reason, and still needs the exception', () => {
    for (const [file, reason] of [...Object.entries(NOT_A_SURFACE), ...Object.entries(awaiting)]) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
      expect(reason.trim().length).toBeGreaterThan(10);
    }
    // Как только «ждущий» файл получил вход (KIT_MOTION/шелл) — исключение надо убрать из baseline.
    const resolved = Object.keys(awaiting).filter((r) => hasHybridEntry(path.join(ROOT, r)));
    expect(resolved).toEqual([]);
    // Содержимое не должно вдруг начать двигаться само: тогда это уже поверхность.
    const nowAnimated = Object.keys(NOT_A_SURFACE).filter((r) =>
      /<Modal\b|with(Spring|Timing)\s*\(|Animated\.(timing|spring)\s*\(/.test(stripComments(fs.readFileSync(path.join(ROOT, r), 'utf8'))));
    expect(nowAnimated).toEqual([]);
  });

  it('every NEW modal-like surface enters through the hybrid (motionVariant or shared shells)', () => {
    const offenders = modalLike
      .filter((f) => !hasHybridEntry(f))
      .map(rel)
      .filter((r) => !legacySet.has(r));
    expect(offenders).toEqual([]);
  });

  it('legacy list only shrinks (ratchet)', () => {
    const stillLegacy = modalLike
      .filter((f) => !hasHybridEntry(f))
      .map(rel);
    // Всё, что осталось без гибрида, обязано быть в baseline; вычищенные файлы
    // из baseline можно (и нужно) удалять — но добавлять новые нельзя.
    const notInBaseline = stillLegacy.filter((r) => !legacySet.has(r));
    expect(notInBaseline).toEqual([]);
  });

  it('hybrid surfaces have no flat opacity-only press feedback on action buttons', () => {
    const offenders = modalLike
      .filter((f) => hasHybridEntry(f))
      .filter((f) => FLAT_PRESS.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map(rel)
      // Классические ветки старых файлов сохраняют прежний вид намеренно —
      // сторожим только файлы, которые целиком гибридные (нет слова 'classic').
      .filter((r) => !/classic/.test(fs.readFileSync(path.join(ROOT, r), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('hybrid components render no emoji in UI source', () => {
    const hybridFiles = files.filter((f) => /Hybrid\w*\.tsx$/.test(path.basename(f)) || /components\/modal_fx\//.test(rel(f)));
    const offenders = hybridFiles
      .filter((f) => EMOJI.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('motion numbers come from the shared dictionary, not magic springs', () => {
    // Гибридные файлы обязаны брать числа из словаря — напрямую или через общий
    // гибридный хук/шелл (те импортируют словарь сами). Файл, который сам зовёт
    // withSpring/withTiming с литералами и не импортирует словарь, — нарушение.
    const hybridFiles = files.filter((f) => /Hybrid\w*\.tsx$/.test(path.basename(f)));

    const OWN_MOTION = /with(Spring|Timing)\s*\(/;
    const offenders = hybridFiles
      .filter((f) => {
        const src = fs.readFileSync(f, 'utf8');
        if (/constants\/motionHybrid/.test(src)) return false;
        // Нет собственных пружин/таймингов — нечего брать из словаря
        // (делегат общего хука/шелла или тонкая обёртка над нативом).
        if (!OWN_MOTION.test(stripComments(src))) return false;
        return true;
      })
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('keeps the survey sheet motion token-driven, finite, and compositor-only', () => {
    const surveyMotionFiles = [
      'components/survey/SurveyQuestionTransition.tsx',
      'components/survey/SurveyRewardPanel.tsx',
      'components/survey/SurveySheetModal.tsx',
    ];
    const sources = surveyMotionFiles.map((file) => ({
      file,
      source: fs.readFileSync(path.join(ROOT, file), 'utf8'),
    }));
    const combined = sources.map(({ source }) => stripComments(source)).join('\n');

    for (const { file, source } of sources) {
      if (/with(?:Timing|Spring)\s*\(/.test(source)) {
        expect(source).toContain('constants/motionHybrid');
      }
      expect(surveyMotionViolations(stripComments(source))).toEqual([]);
      expect(source).not.toMatch(/animatedHeight|height:\s*\w+\.value/);
      expect(file).not.toBe('');
    }
    expect(combined).not.toMatch(/setInterval|withRepeat|Animated\.loop|BlurView|LayoutAnimation/);
    expect(combined).toContain('sheetHeight="86%"');
  });

  it('detects numeric motion literals anywhere inside balanced nested calls', () => {
    const longNestedConfig = `withTiming(value, { easing: curve(${Array.from({ length: 80 }, () => 'token').join(',')}), duration: 240 })`;
    const badSource = [
      'Animated.timing(value, { duration: 120 })',
      longNestedConfig,
      'withDelay(90, withTiming(value, { duration: LUM.contentMs }))',
      'withSpring(value, { damping: 20, stiffness: LUM.settle.stiffness })',
    ].join('\n');

    expect(surveyMotionViolations(badSource)).toEqual(expect.arrayContaining([
      'Animated.timing:numeric-duration',
      'withTiming:numeric-duration',
      'withDelay:numeric-delay',
      'withSpring:inline-numeric-config',
    ]));
    expect(surveyMotionViolations('withDelay(LUM.ladder[0], withSpring(value, LUM.settle))')).toEqual([]);
  });
});
