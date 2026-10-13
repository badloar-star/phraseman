// зачем (аудит Optimistic UI «Профиль и Уроки», координатор 13.10): экран итога урока не ждёт 32 последовательных getItem (один multiGet, разбор прежний),
// а «Следующий урок» сразу держит нажатый вид и не пускает повторный тап. Контракт + проверка, что новая сводка даёт те же числа, что прежний цикл.
import fs from 'node:fs';
import path from 'node:path';

import { LESSON_PROGRESS_PASS_CORRECT, summarizeLessonProgress } from '../app/lesson_progress_scan';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

/** Прежний цикл из lesson_complete.tsx (до 13.10), дословно по смыслу — эталон для сверки. */
function legacySummary(rows: readonly (readonly [number, string | null])[], lessonId: number) {
  let lessonCount = 0;
  let perfectCount = 0;
  let wasPerfect = false;
  for (const [i, saved] of rows) {
    try {
      if (saved) {
        const p: string[] = JSON.parse(saved);
        const correct = p.filter((x) => x === 'correct' || x === 'replay_correct').length;
        if (correct >= 45) {
          lessonCount++;
          const wrong = p.filter((x) => x === 'wrong').length;
          if (wrong === 0 && i === lessonId) wasPerfect = true;
          if (wrong === 0) perfectCount++;
        }
      }
    } catch { /* прежний код логировал и шёл дальше */ }
  }
  return { lessonCount, perfectCount, wasPerfect };
}

function progress(correct: number, wrong: number, replay = 0): string {
  return JSON.stringify([...Array(correct).fill('correct'), ...Array(replay).fill('replay_correct'), ...Array(wrong).fill('wrong')]);
}

describe('сводка прохождения для ачивок: тот же результат, что у прежнего цикла', () => {
  const rows: (readonly [number, string | null])[] = [
    [1, progress(50, 0)],            // пройден идеально
    [2, progress(45, 3)],            // пройден с ошибками
    [3, progress(44, 0)],            // не дотянул
    [4, progress(40, 0, 5)],         // replay_correct тоже считается: 45
    [5, null],                       // нет записи
    [6, '{"oops":1}'],               // не массив — прежний код упал бы в catch и пропустил
    [7, 'not json'],                 // битый JSON
    [8, progress(50, 0)],
  ];

  it('считает проход, идеальные и «идеальность текущего урока»', () => {
    for (const lessonId of [1, 2, 3, 8, 9]) {
      const mine = summarizeLessonProgress(rows, lessonId);
      const legacy = legacySummary(rows, lessonId);
      expect({ lessonCount: mine.lessonCount, perfectCount: mine.perfectCount, wasPerfect: mine.wasPerfect }).toEqual(legacy);
    }
    expect(LESSON_PROGRESS_PASS_CORRECT).toBe(45);
  });

  it('битые записи не валят остальные и считаются отдельно', () => {
    const s = summarizeLessonProgress(rows, 1);
    expect(s.brokenKeys).toBe(2);
    expect(s.lessonCount).toBe(4);
    expect(s.perfectCount).toBe(3);
    expect(s.wasPerfect).toBe(true);
  });

  it('пустое хранилище → нули', () => {
    expect(summarizeLessonProgress([], 1)).toEqual({ lessonCount: 0, perfectCount: 0, wasPerfect: false, brokenKeys: 0 });
  });
});

describe('экран итога: контракт по строкам файлов', () => {
  const lc = read('app/lesson_complete.tsx');
  const scan = read('app/lesson_progress_scan.ts');
  const done = read('components/completion/V2DoneScreen.tsx');

  it('32 getItem заменены одним multiGet, замеры пишутся в [LESSON-RESULT-SAVE]', () => {
    expect(scan).toMatch(/AsyncStorage\.multiGet\(keys\)/);
    expect(scan).toMatch(/LESSON_PROGRESS_SCAN_COUNT = 32/);
    expect(lc).toMatch(/await scanLessonProgress\(studyTarget, lessonId\)/);
    expect(lc).not.toMatch(/for \(let i = 1; i <= 32; i\+\+\)/);
    expect(lc).toContain('[LESSON-RESULT-SAVE]');
    expect(lc).toMatch(/gates \+\$\{Date\.now\(\) - completeMountedAtRef\.current\}мс/);
  });

  it('облачная/премиум-проверка не тронута и по-прежнему идёт параллельно с остальным', () => {
    expect(lc).toMatch(/getVerifiedPremiumAccessStatus\(\{\n\s*bypassCache: true,\n\s*allowCloudRefresh: false,/);
    expect(lc).toMatch(/void Promise\.all\(\[\n\s*getVerifiedPremiumAccessStatus/);
  });

  it('«Следующий урок»: нажатое состояние, замок nav_once и журнал [LESSON-NEXT]', () => {
    expect(lc).toMatch(/if \(!navOnce\(`lesson_complete:next:\$\{lessonId\}`\)\) return;/);
    expect(lc).toMatch(/nextOpeningRef\.current = true;\n\s*setNextOpening\(true\);/);
    expect(lc).toMatch(/nextOpeningRef\.current = false;\n\s*setNextOpening\(false\);/);
    expect(lc).toMatch(/primaryBusy=\{nextOpening\}/);
    expect(lc).toContain('[LESSON-NEXT]');
  });

  it('V2DoneScreen: primaryBusy держит нажатый вид и не пускает повторный тап (без спиннера)', () => {
    expect(done).toMatch(/primaryBusy\?: boolean;/);
    expect(done).toMatch(/onPress=\{\(\) => \{ if \(props\.primaryBusy\) return; hapticTap\(\); props\.onPrimary\(\); \}\}/);
    expect(done).toMatch(/accessibilityState=\{\{ busy: props\.primaryBusy === true, disabled: props\.primaryBusy === true \}\}/);
    expect(done).not.toMatch(/ActivityIndicator/);
  });
});
