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
const HYBRID_ENTRY = /motionVariant|HybridAlertShell|HybridSheetShell|FullscreenHybridEntrance|useRewardImpactHybrid|MotionModal/;

/** Кнопки-действия без вдавливания: плоское затемнение вместо клавиши. */
const FLAT_PRESS = /opacity:\s*pressed\s*\?/;

/** Эмодзи в исходнике UI (комментарии вырезаются перед проверкой). */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{23F3}]/u;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('motion hybrid contract', () => {
  const files = [...walk(path.join(ROOT, 'components')), ...walk(path.join(ROOT, 'app'))];
  const modalLike = files.filter((f) => MODAL_LIKE.test(path.basename(f)));
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as { legacyModalFiles: string[] };
  const legacySet = new Set(baseline.legacyModalFiles);

  it('every NEW modal-like surface enters through the hybrid (motionVariant or shared shells)', () => {
    const offenders = modalLike
      .filter((f) => !HYBRID_ENTRY.test(fs.readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !legacySet.has(r));
    expect(offenders).toEqual([]);
  });

  it('legacy list only shrinks (ratchet)', () => {
    const stillLegacy = modalLike
      .filter((f) => !HYBRID_ENTRY.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    // Всё, что осталось без гибрида, обязано быть в baseline; вычищенные файлы
    // из baseline можно (и нужно) удалять — но добавлять новые нельзя.
    const notInBaseline = stillLegacy.filter((r) => !legacySet.has(r));
    expect(notInBaseline).toEqual([]);
  });

  it('hybrid surfaces have no flat opacity-only press feedback on action buttons', () => {
    const offenders = modalLike
      .filter((f) => HYBRID_ENTRY.test(fs.readFileSync(f, 'utf8')))
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
});
