import fs from "node:fs";
import path from "node:path";

// ════════════════════════════════════════════════════════════════════════════
// Сторож удаления диагнозов тренера — осколка раздела «Моя практика».
//
// зачем: раздел удалён коммитом 4ccd8c4f4 (replace legacy trainer with mistake
// practice), но персональные тренировки и коуч-тост тогда снести забыли: 60
// файлов данных (4.17 МБ в JS-бандле) и экран /problem_coach продолжали жить,
// а тост после урока мог их открыть. Решение владельца 2026-08-24 — удалить
// целиком. Этот контракт держит границу: данные, экран и тост не должны
// вернуться, а соседние живые поверхности (разбор фраз, экран завершения
// урока, тренировка слов) обязаны остаться на месте.
// ════════════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(__dirname, "..");
const exists = (relativePath: string): boolean =>
  fs.existsSync(path.join(ROOT, relativePath));
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const RETIRED_ROUTE = "/problem_coach";

const RETIRED_OWNED_FILES = [
  "app/problem_coach.tsx",
  "app/diagnosis_trainings.ts",
  "app/diagnosis_training_engine.ts",
  "app/diagnosis_training_types.ts",
  "app/diagnosis_training_progress.ts",
  "app/diagnosis_training_copy.ts",
  "app/coach_toast_trigger.ts",
  "app/personal_practice_lesson_router.ts",
  "app/personal_practice_target_gate.ts",
  "app/personal_training_taxonomy.ts",
  "app/personal_training_intro_blocks.ts",
  "components/CoachToast.tsx",
  // недельный обзор — та же ветка раздела, к моменту удаления уже без импортёров
  "app/WeeklyReviewCard.tsx",
  "app/weekly_review_client.ts",
  "app/weekly_review_briefing.ts",
] as const;

function collectSourceFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(absoluteRoot, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(path.relative(ROOT, child));
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [child] : [];
    });
}

describe("retired coach diagnosis full-removal boundary", () => {
  test("файлы диагнозов, экран тренера и тост не вернулись", () => {
    for (const relativePath of RETIRED_OWNED_FILES) {
      expect(exists(relativePath)).toBe(false);
    }
    // Ни одного файла данных тренировок: это и был вес в бандле.
    const dataFiles = fs
      .readdirSync(path.join(ROOT, "app"))
      .filter((name) => name.startsWith("diagnosis_training_"));
    expect(dataFiles).toEqual([]);
  });

  test("рантайм не импортирует удалённые модули и не знает маршрута", () => {
    // зачем: файлы читаем ПО ОДНОМУ, не склеивая в одну строку — склейка всего
    // app/+components/ роняла воркер по памяти (heap OOM на этом дереве).
    const retiredImport =
      /(?:from\s*|import\s*\()(['"])\.?\.?\/[^'"]*(?:diagnosis_training|coach_toast_trigger|personal_practice_lesson_router|personal_practice_target_gate|personal_training_taxonomy|personal_training_intro_blocks|weekly_review_briefing|weekly_review_client|CoachToast)\1/;

    const offenders: string[] = [];
    for (const file of ["app", "components"].flatMap(collectSourceFiles)) {
      const source = fs.readFileSync(file, "utf8");
      const relative = path.relative(ROOT, file).replace(/\\/g, "/");
      if (retiredImport.test(source)) offenders.push(`${relative}: импорт удалённого модуля`);
      if (source.includes(RETIRED_ROUTE)) offenders.push(`${relative}: маршрут ${RETIRED_ROUTE}`);
      // Пейвол-контекст удалённого экрана: открывать его больше некому.
      if (source.includes("'diagnosis_training'")) offenders.push(`${relative}: контекст diagnosis_training`);
    }
    expect(offenders).toEqual([]);
  });

  test("живые соседние поверхности остались на месте", () => {
    // Разбор фраз — экран жив и считает ошибки сам, без «погашенных тренировкой».
    expect(exists("app/phrase_analytics_screen.tsx")).toBe(true);
    expect(exists("app/phrase_analytics.ts")).toBe(true);
    const analytics = read("app/phrase_analytics.ts");
    expect(analytics).toContain("const activeCategories = resolved.categories;");

    // Экран завершения урока и тренировка слов живы — из них убрали только тост.
    for (const relativePath of ["app/lesson_complete.tsx", "app/lesson_words.tsx", "app/lesson1.tsx"]) {
      expect(exists(relativePath)).toBe(true);
      expect(read(relativePath)).not.toContain("CoachToast");
    }

    // Разбор ошибок (mistake practice) — это ДРУГАЯ, живая фича, её не трогали.
    expect(exists("app/mistake_practice_store.ts")).toBe(true);
  });
});
